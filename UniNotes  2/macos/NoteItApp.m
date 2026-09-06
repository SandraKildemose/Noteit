#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface NoteItDelegate : NSObject <NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler>
@property(nonatomic, strong) NSWindow *window;
@property(nonatomic, strong) WKWebView *webView;
@property(nonatomic, assign) BOOL selfTest;
@end

@implementation NoteItDelegate

- (NSURL *)databaseDirectoryURL {
    NSURL *applicationSupport = [NSFileManager.defaultManager URLsForDirectory:NSApplicationSupportDirectory
                                                                      inDomains:NSUserDomainMask].firstObject;
    return [applicationSupport URLByAppendingPathComponent:@"Noteit" isDirectory:YES];
}

- (NSURL *)databaseURL {
    return [[self databaseDirectoryURL] URLByAppendingPathComponent:@"database.json"];
}

- (NSString *)appBuildNumber {
    NSURL *versionURL = [NSBundle.mainBundle.resourceURL URLByAppendingPathComponent:@"version.json"];
    NSData *data = [NSData dataWithContentsOfURL:versionURL];
    if (!data) return @"0";
    id json = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    if (![json isKindOfClass:NSDictionary.class]) return @"0";
    id build = json[@"build"];
    if ([build isKindOfClass:NSNumber.class]) return [(NSNumber *)build stringValue];
    if ([build isKindOfClass:NSString.class]) return build;
    return @"0";
}

- (NSString *)freshIndexHTML {
    NSURL *resources = NSBundle.mainBundle.resourceURL;
    NSURL *indexURL = [resources URLByAppendingPathComponent:@"index.html"];
    NSMutableString *html = [[NSString stringWithContentsOfURL:indexURL encoding:NSUTF8StringEncoding error:nil] mutableCopy];
    if (!html.length) return nil;
    NSString *build = [self appBuildNumber];
    NSString *stamp = [NSString stringWithFormat:@"%.0f", NSDate.date.timeIntervalSince1970];
    [html replaceOccurrencesOfString:@"__BUILD__" withString:build options:0 range:NSMakeRange(0, html.length)];
    [html replaceOccurrencesOfString:@"__STAMP__" withString:stamp options:0 range:NSMakeRange(0, html.length)];
    return html;
}

- (NSDictionary *)nativeDatabase {
    if (self.selfTest) return @{@"version": @1, @"storage": @{}};
    NSData *data = [NSData dataWithContentsOfURL:[self databaseURL]];
    if (!data) return @{@"version": @1, @"storage": @{}};
    id object = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    return [object isKindOfClass:NSDictionary.class] ? object : @{@"version": @1, @"storage": @{}};
}

- (void)saveNativeDatabase:(NSDictionary *)database {
    if (self.selfTest || ![NSJSONSerialization isValidJSONObject:database]) return;
    NSFileManager *files = NSFileManager.defaultManager;
    NSURL *directory = [self databaseDirectoryURL];
    [files createDirectoryAtURL:directory withIntermediateDirectories:YES attributes:nil error:nil];
    [files setAttributes:@{NSFilePosixPermissions: @0700} ofItemAtPath:directory.path error:nil];
    NSURL *databaseURL = [self databaseURL];
    NSURL *backupURL = [directory URLByAppendingPathComponent:@"database.backup.json"];
    if ([files fileExistsAtPath:databaseURL.path]) {
        [files removeItemAtURL:backupURL error:nil];
        [files copyItemAtURL:databaseURL toURL:backupURL error:nil];
        [files setAttributes:@{NSFilePosixPermissions: @0600} ofItemAtPath:backupURL.path error:nil];
    }
    NSData *json = [NSJSONSerialization dataWithJSONObject:database options:NSJSONWritingPrettyPrinted error:nil];
    [json writeToURL:databaseURL options:NSDataWritingAtomic error:nil];
    [files setAttributes:@{NSFilePosixPermissions: @0600} ofItemAtPath:databaseURL.path error:nil];
}

- (NSString *)nativeDatabaseBootstrapScript {
    NSDictionary *database = [self nativeDatabase];
    NSData *json = [NSJSONSerialization dataWithJSONObject:database options:0 error:nil];
    NSString *payload = [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding] ?: @"{}";
    return [NSString stringWithFormat:@"window.__NOTEIT_NATIVE_APP__=true;window.__NOTEIT_NATIVE_DB__=%@;", payload];
}

- (void)installMainMenu {
    NSMenu *mainMenu = [[NSMenu alloc] initWithTitle:@""];

    NSMenuItem *appMenuItem = [[NSMenuItem alloc] initWithTitle:@"" action:nil keyEquivalent:@""];
    NSMenu *appMenu = [[NSMenu alloc] initWithTitle:@"Note'it"];
    [appMenu addItemWithTitle:@"Om Note'it" action:@selector(orderFrontStandardAboutPanel:) keyEquivalent:@""];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"Skjul Note'it" action:@selector(hide:) keyEquivalent:@"h"];
    [appMenu addItemWithTitle:@"Afslut Note'it" action:@selector(terminate:) keyEquivalent:@"q"];
    appMenuItem.submenu = appMenu;
    [mainMenu addItem:appMenuItem];

    NSMenuItem *fileMenuItem = [[NSMenuItem alloc] initWithTitle:@"" action:nil keyEquivalent:@""];
    NSMenu *fileMenu = [[NSMenu alloc] initWithTitle:@"Arkiv"];
    [fileMenu addItemWithTitle:@"Print note..." action:@selector(printNote:) keyEquivalent:@"p"];
    fileMenuItem.submenu = fileMenu;
    [mainMenu addItem:fileMenuItem];

    NSMenuItem *editMenuItem = [[NSMenuItem alloc] initWithTitle:@"" action:nil keyEquivalent:@""];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"Redigér"];
    [editMenu addItemWithTitle:@"Fortryd" action:@selector(undo:) keyEquivalent:@"z"];
    NSMenuItem *redoItem = [editMenu addItemWithTitle:@"Gentag" action:@selector(redo:) keyEquivalent:@"z"];
    redoItem.keyEquivalentModifierMask = NSEventModifierFlagCommand | NSEventModifierFlagShift;
    [editMenu addItem:[NSMenuItem separatorItem]];
    [editMenu addItemWithTitle:@"Klip" action:@selector(cut:) keyEquivalent:@"x"];
    [editMenu addItemWithTitle:@"Kopiér" action:@selector(copy:) keyEquivalent:@"c"];
    [editMenu addItemWithTitle:@"Indsæt" action:@selector(paste:) keyEquivalent:@"v"];
    [editMenu addItemWithTitle:@"Vælg alt" action:@selector(selectAll:) keyEquivalent:@"a"];
    editMenuItem.submenu = editMenu;
    [mainMenu addItem:editMenuItem];

    NSApp.mainMenu = mainMenu;
}

- (void)printNote:(id)sender {
    [self.webView evaluateJavaScript:@"if(typeof exportActiveNotePdf==='function'){exportActiveNotePdf();}"
                   completionHandler:^(__unused id result, NSError *error) {
        if (error) NSLog(@"Note'it print error: %@", error);
    }];
}

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    self.selfTest = [NSProcessInfo.processInfo.environment[@"NOTEIT_SELFTEST"] boolValue];
    [self installMainMenu];
    WKWebViewConfiguration *configuration = [[WKWebViewConfiguration alloc] init];
    configuration.websiteDataStore = WKWebsiteDataStore.nonPersistentDataStore;
    if (@available(macOS 11.0, *)) {
        configuration.defaultWebpagePreferences.allowsContentJavaScript = YES;
    } else {
        configuration.preferences.javaScriptEnabled = YES;
    }
    WKUserContentController *contentController = [[WKUserContentController alloc] init];
    [contentController addScriptMessageHandler:self name:@"noteitLog"];
    [contentController addScriptMessageHandler:self name:@"noteitStore"];
    [contentController addUserScript:[[WKUserScript alloc] initWithSource:[self nativeDatabaseBootstrapScript]
                                                           injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                        forMainFrameOnly:YES]];
    NSString *diagnostics = @"sessionStorage.removeItem('noted-guest');"
                             "window.addEventListener('error',function(e){window.webkit.messageHandlers.noteitLog.postMessage('JS error: '+e.message+' @ '+e.filename+':'+e.lineno);});"
                             "window.addEventListener('unhandledrejection',function(e){window.webkit.messageHandlers.noteitLog.postMessage('Promise error: '+String(e.reason));});";
    [contentController addUserScript:[[WKUserScript alloc] initWithSource:diagnostics
                                                           injectionTime:WKUserScriptInjectionTimeAtDocumentStart
                                                        forMainFrameOnly:YES]];
    configuration.userContentController = contentController;

    self.webView = [[WKWebView alloc] initWithFrame:NSZeroRect configuration:configuration];
    self.webView.navigationDelegate = self;
    self.webView.UIDelegate = self;
    [self.webView setValue:@NO forKey:@"drawsBackground"];

    NSRect frame = NSMakeRect(0, 0, 1440, 920);
    NSWindowStyleMask style = NSWindowStyleMaskTitled |
                              NSWindowStyleMaskClosable |
                              NSWindowStyleMaskMiniaturizable |
                              NSWindowStyleMaskResizable;
    self.window = [[NSWindow alloc] initWithContentRect:frame
                                              styleMask:style
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    self.window.title = @"Note'it";
    self.window.titlebarAppearsTransparent = NO;
    self.window.titleVisibility = NSWindowTitleVisible;
    self.window.minSize = NSMakeSize(980, 650);
    self.window.contentView = self.webView;
    [self.window center];
    [self.window makeKeyAndOrderFront:nil];

    [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
    [NSApp activateIgnoringOtherApps:YES];
    [self loadApplication];
}

- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
    if ([message.name isEqualToString:@"noteitStore"] && [message.body isKindOfClass:NSDictionary.class]) {
        [self saveNativeDatabase:message.body];
        return;
    }
    NSLog(@"Note'it web: %@", message.body);
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    NSString *probe = @"JSON.stringify({ready:document.readyState,goApp:typeof goApp,buttons:document.querySelectorAll('[data-goto-app]').length,dialog:!!document.getElementById('welcomeDialog')})";
    [webView evaluateJavaScript:probe completionHandler:^(id result, NSError *error) {
        if (error) fprintf(stderr, "NOTEIT_PROBE_ERROR %s\n", error.description.UTF8String);
        else fprintf(stderr, "NOTEIT_READY %s\n", [result description].UTF8String);
    }];
    if (!self.selfTest) return;
    NSString *entryClick = @"location.hash='';if(typeof route==='function')route();var b=document.querySelector('[data-goto-app]');if(b)b.click();";
    [webView evaluateJavaScript:entryClick completionHandler:^(__unused id result, NSError *error) {
        if (error) fprintf(stderr, "NOTEIT_ENTRY_CLICK_ERROR %s\n", error.description.UTF8String);
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 250 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
            NSString *entryResult = @"(function(){var d=document.getElementById('welcomeDialog');return JSON.stringify({button:!!document.querySelector('[data-goto-app]'),dialogOpen:!!(d&&d.open),landingVisible:!document.getElementById('landing').classList.contains('hidden')});})()";
            [webView evaluateJavaScript:entryResult completionHandler:^(id finalResult, NSError *finalError) {
                if (finalError) fprintf(stderr, "NOTEIT_ENTRY_TEST_ERROR %s\n", finalError.description.UTF8String);
                else fprintf(stderr, "NOTEIT_ENTRY_TEST %s\n", [finalResult description].UTF8String);
                [webView evaluateJavaScript:@"document.getElementById('continueGuest').click()" completionHandler:^(__unused id guestClickResult, NSError *guestClickError) {
                    if (guestClickError) fprintf(stderr, "NOTEIT_GUEST_CLICK_ERROR %s\n", guestClickError.description.UTF8String);
                    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 300 * NSEC_PER_MSEC), dispatch_get_main_queue(), ^{
                        NSString *guestResult = @"JSON.stringify({appActive:document.getElementById('app').classList.contains('active'),notebook:!!document.querySelector('[data-start-notebook],.notebook-stack'),hash:location.hash})";
                        [webView evaluateJavaScript:guestResult completionHandler:^(id result, NSError *resultError) {
                            if (resultError) fprintf(stderr, "NOTEIT_GUEST_TEST_ERROR %s\n", resultError.description.UTF8String);
                            else fprintf(stderr, "NOTEIT_GUEST_TEST %s\n", [result description].UTF8String);
                            NSString *featureTest = @"(function(){"
                                "sessionStorage.removeItem('noted-guest');"
                                "localStorage.setItem('noteit-accounts',JSON.stringify([{name:'Test Bruger',email:'test@noteit.local',passwordHash:'test',settings:{country:'DK',interfaceLanguage:'en',defaultLanguage:'en',studyField:'stem',autoCorrect:true},subscription:{active:true,label:'Test Premium'}}]));"
                                "localStorage.setItem('noteit-session','test@noteit.local');"
                                "appSettings.interfaceLanguage='en';"
                                "data=normalize({semesters:[{id:'book-test',name:'Computer Science',program:'bachelor',year:1,color:'#718da4',sort:0}],"
                                "subjects:[{id:'subject-test',name:'Algorithms',color:'#6f8fb5',semesterId:'book-test'}],"
                                "pages:[{id:'page-test',subjectId:'subject-test',title:'Lecture 1',html:'<p>Test</p>',language:'en',docType:'mathematics',toolPacks:['stem','stem'],comments:[],updated:new Date().toISOString()}],"
                                "projects:[],groups:[],resources:[],currentSubject:null,currentPage:null,"
                                "ui:{projectsOpen:false,resourcesOpen:false,widgetsOpen:true,toolbarExpanded:false,programOpen:{},semesterOpen:{},subjectOpen:{},view:'notebook',notebookIndex:0}});"
                                "render();"
                                "var startText=document.querySelector('[data-start-subject] b')?.textContent;"
                                "var sidebarAdd=!!document.getElementById('addSubject');"
                                "var paper=document.querySelector('[data-notebook-subject=\"subject-test\"]');"
                                "paper.click();"
                                "var linked=data.currentSubject==='subject-test'&&data.currentPage==='page-test'&&data.ui.view==='home';"
                                "data.pages[0].sheets=['<p>One</p>','<p>Two</p>','<p>Three</p>','<p>Four</p>'];data.pages[0].sheetTitles=['Intro','Theory','Examples','Summary'];data.pages[0].pageView='stack';renderWorkspace();renderWidgets();"
                                "var stackPaperCount=document.querySelectorAll('.stack-sheet-layer').length+(document.getElementById('notePaper')?1:0);"
                                "var stackTitles=document.querySelectorAll('.stack-page-index [data-sheet-title]').length;"
                                "var zoomControls=document.querySelectorAll('[data-paper-zoom]').length;"
                                "data.pages[0].pageView='continuous';renderWorkspace();renderWidgets();"
                                "var pencilPouch=!!document.querySelector('#widgetsPanel .pencil-pouch');"
                                "var markerColors=document.querySelectorAll('.pencil-pouch [data-marker-color]').length;"
                                "var pouchMouse=!!document.querySelector('.pencil-pouch [data-writing-pointer]');"
                                "var pouchEraser=!!document.querySelector('.pencil-pouch [data-annotation-tool=\"eraser\"]');"
                                "document.querySelector('[data-side-action=\"layout\"]')?.click();"
                                "var layouts=document.querySelectorAll('[data-note-layout]').length;"
                                "var ringCornell=!!document.querySelector('[data-note-layout=\"ringCornell\"]');"
                                "var outlineLayout=!!document.querySelector('[data-note-layout=\"outline\"]');"
                                "var listMarkers=document.querySelectorAll('#listMarkerSelect option').length;"
                                "document.getElementById('layoutDialog')?.close();"
                                "document.querySelector('[data-side-action=\"shortcuts\"]')?.click();"
                                "var shortcuts=document.querySelectorAll('.shortcut-table kbd').length;"
                                "document.getElementById('shortcutDialog')?.close();"
                                "var modelCount=Object.keys(modelTemplates).length;"
                                "var modelCategoriesCount=modelCategories.length;"
                                "var crossStudyModels=['brain','dataStructure','network','economics','language','law','custom'].every(function(id){return !!modelTemplates[id];});"
                                "var examHub=document.querySelectorAll('[data-training-preset]').length;"
                                "var groupHub=document.querySelectorAll('[data-group-hub]').length;"
                                "document.getElementById('startGroupWork')?.click();"
                                "var groupForm=!!document.getElementById('newGroupForm');"
                                "data.groups=[{id:'group-test',name:'Study Group',members:['Test Bruger'],notes:'',cards:[],quiz:[],roles:{},sources:[],decisions:[],feedback:'',files:[],workspaces:{board:[{id:'board-test',text:'Remember the proof',author:'Test Bruger',color:'yellow'}],meetings:[],tasks:[],roleList:[],feedbackList:[]}}];"
                                "data=normalize(data);renderGroupWorkspace('group-test','board');"
                                "var groupBoard=!!document.querySelector('[data-group-form=\"board\"]')&&document.querySelectorAll('.notice-board .board-note').length===1;"
                                "document.getElementById('groupDialog')?.close();"
                                "var resourcesVisible=!!document.getElementById('toggleResources');"
                                "var stickerTool=!!document.querySelector('[data-side-action=\"stickers\"]');"
                                "var mathPackRows=document.querySelectorAll('.toolbar-extra .pack-stem').length;"
                                "var mathContextRows=document.querySelectorAll('.toolbar-context.cat-mathematics').length;"
                                "var fontSize=!!document.getElementById('fontSize');"
                                "var editor=document.getElementById('editor');"
                                "editor.innerHTML='<p>-</p>';var dashText=editor.querySelector('p').firstChild;var dashRange=document.createRange();dashRange.setStart(dashText,1);dashRange.collapse(true);var dashSelection=getSelection();dashSelection.removeAllRanges();dashSelection.addRange(dashRange);"
                                "var dashList=convertTypedListMarker(editor)&&!!editor.querySelector('ul.typed-dash-list li');"
                                "editor.innerHTML='<p>*</p>';var bulletText=editor.querySelector('p').firstChild;var bulletRange=document.createRange();bulletRange.setStart(bulletText,1);bulletRange.collapse(true);dashSelection.removeAllRanges();dashSelection.addRange(bulletRange);"
                                "var bulletList=convertTypedListMarker(editor)&&!!editor.querySelector('ul.typed-bullet-list li');"
                                "editor.innerHTML='<p>Værktøjstest</p>';captureEditorRange();insertUniversityTool('bibliography');"
                                "var insertedTool=editor.textContent.includes('Referencer');"
                                "var toolAudit=auditToolRegistry();"
                                "var allToolRoutes=Object.values(toolPacks).flatMap(function(pack){return pack.tools;}).every(function(item){var box=document.createElement('div');box.innerHTML=packToolHtml(item[0],item[1],'da');var button=box.firstElementChild;return !!button&&(button.matches('[data-tool],[data-university-tool],[data-open-code],[data-command]'));});"
                                "var localAiWorks=localStudyAI('Lav eksamensspørgsmål','Testmateriale').includes('1.');"
                                "var codingPack=!!toolPacks.coding&&toolPacks.coding.tools.length;"
                                "document.getElementById('openCode')?.click();"
                                "var codeLanguages=document.querySelectorAll('#language option').length;"
                                "var codeLibraries=!!document.getElementById('codeLibraries');"
                                "var runCode=!!document.getElementById('runCode');"
                                "var codeDark=getComputedStyle(document.getElementById('codeInput')).backgroundColor;"
                                "document.getElementById('codeDialog')?.close();"
                                "openExamDialog();"
                                "var examStart=!!document.getElementById('planStart');"
                                "document.getElementById('addExamSubject')?.click();"
                                "var examDateRequired=document.getElementById('examDate')?.required;"
                                "var reexamDate=!!document.getElementById('reexamDate');"
                                "var curriculumSources=document.querySelectorAll('input[name=\"curriculumSource\"]').length;"
                                "var customExamQuestions=!!document.getElementById('autoExamQuestions');"
                                "var examFiles=!!document.getElementById('examFiles');"
                                "var copyExamDates=!!document.getElementById('copyExamDates');"
                                "document.getElementById('examSubjectDialog')?.close();"
                                "examData={subjects:[{id:'exam-test',subjectId:'subject-test',name:'Algorithms',date:'2026-08-20',reexamDate:'2026-09-03',source:'both',files:[{name:'pensum.pdf',size:100}],topics:['Sorting','Graphs'],questions:['Forklar tidskompleksitet']}],start:'2026-08-10',plan:[],checks:{},folders:[],trainingResults:[],rewardedPeriods:[]};"
                                "generateExamPlan();"
                                "var examPlanDays=document.querySelectorAll('#examPlan .plan-day').length;"
                                "var examPlanTasks=document.querySelectorAll('#examPlan [data-exam-check]').length;"
                                "document.getElementById('examDialog')?.close();"
                                "examData.plan=[];renderExamPrepSubjects();"
                                "var trainingLocked=!!document.querySelector('#examPrepSubjects [data-go-exam-plan]');"
                                "document.querySelector('[data-side-action=\"layout\"]')?.click();"
                                "var paperSizes=document.querySelectorAll('#paperSizeSelect option').length;"
                                "var layoutPreviewText=!!document.querySelector('.layout-preview strong,.layout-preview em');"
                                "document.getElementById('layoutDialog')?.close();"
                                "var searchKbd=!!document.querySelector('.search-kbd');"
                                "var profileName=!!document.getElementById('topbarProfileName');"
                                "var profileImage=!!document.getElementById('profileImageInput');"
                                "var fixedModel=document.getElementById('fixedStudyModel')?.tagName==='STRONG';"
                                "var fixedVersion=document.getElementById('fixedAppVersion')?.textContent===NOTEIT_APP_VERSION;"
                                "var projectHub=document.querySelectorAll('[data-project-hub]').length;"
                                "data.projects=[{id:'project-test',name:'Thesis',mode:'folder',members:['Test Bruger'],notes:'',cards:[],files:[],tasks:[],decisions:[],workspaces:{milestones:[],kanban:[{id:'task-test',title:'Write method',owner:'Test Bruger',status:'To do'}],research:[],risks:[],team:[],report:[]}}];"
                                "data=normalize(data);renderProjectWorkspace('project-test','kanban');"
                                "var projectKanban=!!document.querySelector('[data-project-form=\"kanban\"]')&&document.querySelectorAll('.kanban-board article').length===1;"
                                "data.pages[0].comments.push({type:'AI hjælp',from:'markering',to:'',text:'Et tydeligt testsvar',replacement:''});"
                                "renderWorkspace();renderWidgets();"
                                "var answerBoard=!!document.querySelector('.answer-board');"
                                "var answerInsert=document.querySelectorAll('[data-insert-answer]').length;"
                                "var answerFollow=!!document.querySelector('[data-follow-answer]');"
                                "var answerDelete=!!document.querySelector('.delete-answer-action');"
                                "var studyHelp=document.querySelectorAll('.study-help-grid button').length;"
                                "var sidePdf=!!document.querySelector('#widgetsPanel [data-side-pdf]');"
                                "var sideModels=!!document.querySelector('#widgetsPanel [data-side-action=\"models\"]');"
                                "var sideShortcuts=!!document.querySelector('#widgetsPanel [data-side-action=\"shortcuts\"]');"
                                "var sideAnnotate=!!document.querySelector('#widgetsPanel [data-side-action=\"annotate\"]');"
                                "var sideLayout=!!document.querySelector('#widgetsPanel [data-side-action=\"layout\"]');"
                                "var noteSearch=!!document.getElementById('noteSearch');"
                                "var pageNavigation=document.querySelectorAll('[data-sheet-direction]').length===2;"
                                "var pageViews=document.querySelectorAll('[data-page-view]').length===3;"
                                "var topSticky=!!document.querySelector('#toolbarPanel #insertSticky');"
                                "var pageNumber=!!document.querySelector('.paper-page-number');"
                                "var toolbarHasPdf=!!document.querySelector('#toolbarPanel #openPdf,#toolbarPanel #toggleDocumentMode');"
                                "var mathTools=toolPacks.stem.tools.length;"
                                "var mathSigma=docTypes.mathematics.icon==='∑'||toolPacks.stem.icon==='∑';"
                                "var studyBoardTitle=document.querySelector('.answer-board-head h3')?.textContent;"
                                "var panelToggle=!!document.querySelector('#toggleWidgets .panel-toggle-icon');"
                                "var notificationButton=Array.from(document.querySelectorAll('.topbar-icon-btn')).some(function(button){return /Notifikationer|🔔/.test(button.title+button.textContent);});"
                                "var oldGraph=!!document.querySelector('#widgetsPanel .widget-graph');"
                                "var oldCode=!!document.querySelector('#widgetsPanel .widget-code-block');"
                                "var mode=document.querySelector('[data-side-action=\"annotate\"]');if(mode)mode.click();"
                                "var annotation=data.pages[0].viewMode==='annotate'&&!!document.getElementById('annotationCanvas');"
                                "var quizQuestions=buildExamQuestions(data.subjects,'mixed').length;"
                                "var examTraining=document.querySelector('[data-ui=\"examPreparation\"]')?.textContent;"
                                "data.pages[0].title='Sorting algorithms';data.pages[0].sheets=['<h2>Sorting</h2><p>Merge sort deler problemet og samler sorterede delsekvenser.</p>'];document.getElementById('drawnExamTopic').value='merge sort';findNotesForDrawnTopic();"
                                "var drawnTopicResults=document.querySelectorAll('[data-open-drawn-note]').length;"
                                "data.ui.view='notebook';render();"
                                "openNotebookDialog();"
                                "var degrees=Array.from(document.getElementById('notebookEducation').options).map(function(o){return o.value;});"
                                "document.getElementById('notebookDialog').close();"
                                "window.confirm=function(){return true;};"
                                "document.querySelector('[data-delete-notebook=\"book-test\"]').click();"
                                "return JSON.stringify({startText:startText,sidebarAdd:sidebarAdd,linkedSubject:linked,stackPaperCount:stackPaperCount,stackTitles:stackTitles,zoomControls:zoomControls,pencilPouch:pencilPouch,markerColors:markerColors,pouchMouse:pouchMouse,pouchEraser:pouchEraser,layouts:layouts,ringCornell:ringCornell,outlineLayout:outlineLayout,listMarkers:listMarkers,paperSizes:paperSizes,layoutPreviewText:layoutPreviewText,shortcuts:shortcuts,modelCount:modelCount,modelCategories:modelCategoriesCount,crossStudyModels:crossStudyModels,examHub:examHub,examStart:examStart,examDateRequired:examDateRequired,reexamDate:reexamDate,curriculumSources:curriculumSources,customExamQuestions:customExamQuestions,examFiles:examFiles,copyExamDates:copyExamDates,examPlanDays:examPlanDays,examPlanTasks:examPlanTasks,trainingLocked:trainingLocked,groupHub:groupHub,groupForm:groupForm,groupBoard:groupBoard,resourcesVisible:resourcesVisible,stickerTool:stickerTool,mathPackRows:mathPackRows,mathContextRows:mathContextRows,fontSize:fontSize,dashList:dashList,bulletList:bulletList,insertedTool:insertedTool,toolAudit:toolAudit,allToolRoutes:allToolRoutes,localAiWorks:localAiWorks,codingPack:codingPack,codeLanguages:codeLanguages,codeLibraries:codeLibraries,runCode:runCode,codeDark:codeDark,projectHub:projectHub,projectKanban:projectKanban,searchKbd:searchKbd,profileName:profileName,profileImage:profileImage,fixedModel:fixedModel,fixedVersion:fixedVersion,drawnTopicResults:drawnTopicResults,answerBoard:answerBoard,answerInsert:answerInsert,answerFollow:answerFollow,answerDelete:answerDelete,studyHelp:studyHelp,sidePdf:sidePdf,sideModels:sideModels,sideShortcuts:sideShortcuts,sideAnnotate:sideAnnotate,sideLayout:sideLayout,noteSearch:noteSearch,pageNavigation:pageNavigation,pageViews:pageViews,topSticky:topSticky,pageNumber:pageNumber,toolbarHasPdf:toolbarHasPdf,mathTools:mathTools,mathSigma:mathSigma,studyBoardTitle:studyBoardTitle,panelToggle:panelToggle,notificationButton:notificationButton,oldGraph:oldGraph,oldCode:oldCode,annotation:annotation,quizQuestions:quizQuestions,examTraining:examTraining,degrees:degrees,trashCount:data.trash.length,deleted:data.semesters.length===0,emptyStart:!!document.querySelector('[data-start-notebook]')});"
                                "})()";
                            [webView evaluateJavaScript:featureTest completionHandler:^(id featureResult, NSError *featureError) {
                                if (featureError) fprintf(stderr, "NOTEIT_FEATURE_TEST_ERROR %s\n", featureError.description.UTF8String);
                                else fprintf(stderr, "NOTEIT_FEATURE_TEST %s\n", [featureResult description].UTF8String);
                                fflush(stderr);
                                [NSApp terminate:nil];
                            }];
                        }];
                    });
                }];
            }];
        });
    }];
}

- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
    NSLog(@"Note'it WebKit process terminated; reloading.");
    [self loadApplication];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)flag {
    if (!flag) {
        [self.window makeKeyAndOrderFront:nil];
    }
    return YES;
}

- (void)loadApplication {
    NSURL *resources = NSBundle.mainBundle.resourceURL;
    NSURL *indexFile = [resources URLByAppendingPathComponent:@"index.html"];
    if (!resources || ![NSFileManager.defaultManager fileExistsAtPath:indexFile.path]) {
        NSAlert *alert = [[NSAlert alloc] init];
        alert.messageText = @"Note'it kunne ikke åbnes";
        alert.informativeText = @"Appens index.html kunne ikke findes.";
        alert.alertStyle = NSAlertStyleCritical;
        [alert runModal];
        [NSApp terminate:nil];
        return;
    }
    NSString *html = [self freshIndexHTML];
    if (!html.length) {
        NSAlert *alert = [[NSAlert alloc] init];
        alert.messageText = @"Note'it kunne ikke åbnes";
        alert.informativeText = @"index.html kunne ikke læses fra appen.";
        alert.alertStyle = NSAlertStyleCritical;
        [alert runModal];
        [NSApp terminate:nil];
        return;
    }
    NSSet *allTypes = WKWebsiteDataStore.allWebsiteDataTypes;
    [WKWebsiteDataStore.defaultDataStore removeDataOfTypes:allTypes
                                             modifiedSince:[NSDate dateWithTimeIntervalSince1970:0]
                                         completionHandler:^{
        [self.webView loadHTMLString:html baseURL:resources];
    }];
}

- (void)webView:(WKWebView *)webView
decidePolicyForNavigationAction:(WKNavigationAction *)navigationAction
decisionHandler:(void (^)(WKNavigationActionPolicy))decisionHandler {
    NSURL *url = navigationAction.request.URL;
    if (!url) {
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }

    NSString *scheme = url.scheme.lowercaseString;
    if (url.fileURL || [scheme isEqualToString:@"about"] || [scheme isEqualToString:@"blob"]) {
        decisionHandler(WKNavigationActionPolicyAllow);
        return;
    }

    if ([scheme isEqualToString:@"mailto"]) {
        [NSWorkspace.sharedWorkspace openURL:url];
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }

    if (navigationAction.navigationType == WKNavigationTypeLinkActivated) {
        [NSWorkspace.sharedWorkspace openURL:url];
        decisionHandler(WKNavigationActionPolicyCancel);
        return;
    }

    decisionHandler(WKNavigationActionPolicyAllow);
}

- (WKWebView *)webView:(WKWebView *)webView
createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration
   forNavigationAction:(WKNavigationAction *)navigationAction
        windowFeatures:(WKWindowFeatures *)windowFeatures {
    NSURL *url = navigationAction.request.URL;
    if (url) {
        [NSWorkspace.sharedWorkspace openURL:url];
    }
    return nil;
}

- (void)webView:(WKWebView *)webView
runOpenPanelWithParameters:(WKOpenPanelParameters *)parameters
initiatedByFrame:(WKFrameInfo *)frame
completionHandler:(void (^)(NSArray<NSURL *> * _Nullable URLs))completionHandler {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = parameters.allowsDirectories;
    panel.allowsMultipleSelection = parameters.allowsMultipleSelection;
    panel.resolvesAliases = YES;
    panel.message = @"Vælg PDF-filer eller andet studiemateriale";
    panel.prompt = @"Vælg";
    [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) {
        completionHandler(result == NSModalResponseOK ? panel.URLs : nil);
    }];
}

- (void)webView:(WKWebView *)webView
runJavaScriptAlertPanelWithMessage:(NSString *)message
initiatedByFrame:(WKFrameInfo *)frame
completionHandler:(void (^)(void))completionHandler {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"Note'it";
    alert.informativeText = message;
    [alert addButtonWithTitle:@"OK"];
    [alert beginSheetModalForWindow:self.window completionHandler:^(__unused NSModalResponse response) {
        completionHandler();
    }];
}

- (void)webView:(WKWebView *)webView
runJavaScriptConfirmPanelWithMessage:(NSString *)message
initiatedByFrame:(WKFrameInfo *)frame
completionHandler:(void (^)(BOOL result))completionHandler {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"Note'it";
    alert.informativeText = message;
    [alert addButtonWithTitle:@"OK"];
    [alert addButtonWithTitle:@"Annuller"];
    [alert beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse response) {
        completionHandler(response == NSAlertFirstButtonReturn);
    }];
}

@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        NSApplication *application = NSApplication.sharedApplication;
        NoteItDelegate *delegate = [[NoteItDelegate alloc] init];
        application.delegate = delegate;
        [application run];
    }
    return 0;
}
