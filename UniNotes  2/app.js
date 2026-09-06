/* Note'it: stabil universitetsnotesbog */
const STORAGE_KEY = 'stemnotes-v5';
const NATIVE_STORAGE_PREFIXES = ['noteit-', 'noted-', 'stemnotes-'];
let nativeStorageSyncTimer;

(function hydrateNativeStorage() {
  const storage = window.__NOTEIT_NATIVE_DB__?.storage;
  if (!storage || typeof storage !== 'object') return;
  Object.entries(storage).forEach(([key, value]) => {
    if (typeof value === 'string') localStorage.setItem(key, value);
  });
})();

function nativeStorageSnapshot() {
  const storage = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && NATIVE_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix))) {
      storage[key] = localStorage.getItem(key);
    }
  }
  return { version: 1, updatedAt: new Date().toISOString(), storage };
}

function syncNativeStorage() {
  if (!window.__NOTEIT_NATIVE_APP__ || !window.webkit?.messageHandlers?.noteitStore) return;
  clearTimeout(nativeStorageSyncTimer);
  nativeStorageSyncTimer = setTimeout(() => {
    window.webkit.messageHandlers.noteitStore.postMessage(nativeStorageSnapshot());
  }, 120);
}

if (window.__NOTEIT_NATIVE_APP__) {
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function(key, value) {
    nativeSetItem.call(this, key, value);
    if (this === localStorage) syncNativeStorage();
  };
  Storage.prototype.removeItem = function(key) {
    nativeRemoveItem.call(this, key);
    if (this === localStorage) syncNativeStorage();
  };
}

function normalizedEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function accountStorageKey(email, area) {
  return `noteit-user:${normalizedEmail(email)}:${area}`;
}

function activeAccountEmail() {
  return normalizedEmail(localStorage.getItem('noteit-session') || '');
}

function isIpadLikeDevice() {
  return /iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function syncDeviceCapabilities() {
  document.documentElement.classList.toggle('ipad-device', isIpadLikeDevice());
  document.documentElement.classList.toggle('touch-device', navigator.maxTouchPoints > 0);
}

function scopedStorage(area, legacyKey) {
  const email = activeAccountEmail();
  return (email && localStorage.getItem(accountStorageKey(email, area)))
    || localStorage.getItem(legacyKey);
}

const colors = ['#7772a8', '#6f8fb5', '#78a9bd', '#76aaa1', '#7fa188', '#a9b47b', '#c9aa70', '#c89470', '#bd7777', '#b77f9e', '#947cac', '#7d8795'];

const docTypes = {
  general: { label: 'Alm. noter', icon: '', tools: ['heading', 'bulletList', 'checklist', 'quote', 'table', 'code'] },
  biology: { label: 'Biologi', icon: '', tools: ['anatomy', 'evidence', 'statistics', 'labReport', 'model', 'code'] },
  tech: { label: 'Datalogi', icon: '', tools: ['code', 'algorithm', 'table', 'model'] },
  chemistry: { label: 'Kemi', icon: '', tools: ['formula', 'latex', 'labReport', 'siUnits', 'convert', 'model', 'code'] },
  engineering: { label: 'Ingeniørfag', icon: '', tools: ['circuit', 'draw', 'calculator', 'siUnits', 'labReport', 'model', 'code'] },
  civilEngineering: { label: 'Bygningsingeniør', icon: '', tools: ['mechanics', 'siUnits', 'calculator', 'draw', 'model', 'code'] },
  electricalEngineering: { label: 'Elektroingeniør', icon: '', tools: ['circuit', 'siUnits', 'calculator', 'code', 'model'] },
  mechanicalEngineering: { label: 'Maskiningeniør', icon: '', tools: ['mechanics', 'calculator', 'siUnits', 'draw', 'model', 'code'] },
  softwareEngineering: { label: 'Software engineering', icon: '', tools: ['code', 'algorithm', 'table', 'model'] },
  biotechnology: { label: 'Bioteknologi', icon: '', tools: ['labReport', 'statistics', 'formula', 'model', 'code'] },
  physics: { label: 'Fysik', icon: '', tools: ['siUnits', 'labReport', 'graph', 'convert', 'integral', 'model', 'code'] },
  mathematics: { label: 'Matematik', icon: '', tools: ['algebra', 'calculus', 'linearAlgebra', 'differentialEquations', 'analysis', 'complexAnalysis', 'probability', 'statistics', 'numericalMethods', 'optimization', 'geometry', 'topology', 'discreteMath', 'numberTheory', 'logic', 'latex', 'graph', 'matrix', 'code'] },
  medicine: { label: 'Medicin', icon: '', tools: ['patientCase', 'anatomy', 'dosage', 'evidence', 'statistics', 'model', 'code'] },
  psychology: { label: 'Psykologi', icon: '', tools: ['brainMap', 'memoryModel', 'cognition', 'experimentDesign', 'statistics', 'model', 'code'] },
  health: { label: 'Sundhed', icon: '', tools: ['labReport', 'statistics', 'model', 'code'] },
  statistics: { label: 'Statistik', icon: '', tools: ['statistics', 'probability', 'graph', 'table', 'calculator', 'code'] },
  other: { label: 'Alm.', icon: '', tools: ['code'] },
};

const studyFields = {
  general: { label: 'Andet', icon: '▤', description: 'En fri notesbog, der kan tilpasses dit studie' },
  stem: { label: 'Tech og STEM', icon: '</>', description: 'Matematik, naturvidenskab, IT og ingeniørfag' },
  coding: { label: 'Kodeværktøjer', icon: '</>', description: 'Én kodeeditor med alle sprog, robotik og fejlfinding' },
  psychology: { label: 'Psykologi', icon: 'Ψ', description: 'Hjerne, kognition, adfærd, neuro og forskningsmetode' },
  health: { label: 'Sundhed og medicin', icon: '+', description: 'Medicin, sygepleje, farmaci og sundhed' },
};

const STUDY_AREA_OPTIONS = {
  general: { label: 'Andet', icon: '▤', description: '', pack: 'general', docType: 'general', tone: 'neutral' },
  mathematics: { label: 'Matematik', icon: '∑', description: '', pack: 'stem', docType: 'mathematics', tone: 'math' },
  physics: { label: 'Fysik', icon: 'φ', description: '', pack: 'stem', docType: 'physics', tone: 'science' },
  chemistry: { label: 'Kemi', icon: '⚗', description: '', pack: 'stem', docType: 'chemistry', tone: 'science' },
  biology: { label: 'Biologi', icon: '⌬', description: '', pack: 'stem', docType: 'biology', tone: 'life' },
  biotechnology: { label: 'Bioteknologi', icon: '⬡', description: '', pack: 'stem', docType: 'biotechnology', tone: 'life' },
  statistics: { label: 'Statistik', icon: 'σ', description: '', pack: 'stem', docType: 'mathematics', tone: 'math' },
  tech: { label: 'Tech & IT', icon: '</>', description: '', pack: 'stem', docType: 'tech', tone: 'tech' },
  softwareEngineering: { label: 'Software engineering', icon: '{ }', description: '', pack: 'stem', docType: 'softwareEngineering', tone: 'tech' },
  engineering: { label: 'Ingeniørfag', icon: '⚙', description: '', pack: 'stem', docType: 'engineering', tone: 'tech' },
  electricalEngineering: { label: 'Elektro', icon: '∿', description: '', pack: 'stem', docType: 'electricalEngineering', tone: 'tech' },
  mechanicalEngineering: { label: 'Maskin', icon: '⚙', description: '', pack: 'stem', docType: 'mechanicalEngineering', tone: 'tech' },
  civilEngineering: { label: 'Byg & anlæg', icon: '△', description: '', pack: 'stem', docType: 'civilEngineering', tone: 'tech' },
  architecture: { label: 'Arkitektur', icon: '⌂', description: '', pack: 'stem', docType: 'civilEngineering', tone: 'tech' },
  medicine: { label: 'Medicin', icon: '✚', description: '', pack: 'health', docType: 'medicine', tone: 'health' },
  health: { label: 'Sundhed', icon: '+', description: '', pack: 'health', docType: 'health', tone: 'health' },
  nursing: { label: 'Sygepleje', icon: '+', description: '', pack: 'health', docType: 'health', tone: 'health' },
  pharmacology: { label: 'Farmaci', icon: 'Rx', description: '', pack: 'health', docType: 'medicine', tone: 'health' },
  dentistry: { label: 'Tandlæge', icon: '+', description: '', pack: 'health', docType: 'medicine', tone: 'health' },
  sportsScience: { label: 'Idræt', icon: '→', description: '', pack: 'health', docType: 'health', tone: 'health' },
  humanities: { label: 'Humaniora', icon: '¶', description: '', pack: 'humanities', docType: 'humanities', tone: 'humanities' },
  history: { label: 'Historie', icon: '↶', description: '', pack: 'humanities', docType: 'history', tone: 'humanities' },
  culturalStudies: { label: 'Kultur', icon: '◈', description: '', pack: 'humanities', docType: 'culturalStudies', tone: 'humanities' },
  philosophy: { label: 'Filosofi', icon: '∴', description: '', pack: 'humanities', docType: 'humanities', tone: 'humanities' },
  literature: { label: 'Litteratur', icon: '¶', description: '', pack: 'humanities', docType: 'humanities', tone: 'humanities' },
  theology: { label: 'Teologi', icon: '✠', description: '', pack: 'humanities', docType: 'humanities', tone: 'humanities' },
  social: { label: 'Samfund', icon: '◎', description: '', pack: 'social', docType: 'social', tone: 'social' },
  psychology: { label: 'Psykologi', icon: 'Ψ', description: '', pack: 'psychology', docType: 'psychology', tone: 'psych' },
  economics: { label: 'Økonomi', icon: '%', description: '', pack: 'economics', docType: 'economics', tone: 'econ' },
  politicalScience: { label: 'Statskundskab', icon: '◎', description: '', pack: 'social', docType: 'social', tone: 'social' },
  anthropology: { label: 'Antropologi', icon: '◎', description: '', pack: 'social', docType: 'social', tone: 'social' },
  pedagogy: { label: 'Pædagogik', icon: '◎', description: '', pack: 'social', docType: 'social', tone: 'social' },
  law: { label: 'Jura', icon: '§', description: '', pack: 'law', docType: 'law', tone: 'law' },
  criminology: { label: 'Kriminologi', icon: '§', description: '', pack: 'law', docType: 'law', tone: 'law' },
  publicLaw: { label: 'Offentlig ret', icon: '§', description: '', pack: 'law', docType: 'law', tone: 'law' },
  internationalLaw: { label: 'International ret', icon: '§', description: '', pack: 'law', docType: 'law', tone: 'law' },
  businessLaw: { label: 'Erhvervsret', icon: '§', description: '', pack: 'law', docType: 'law', tone: 'law' },
  humanRights: { label: 'Menneskeret', icon: '§', description: '', pack: 'law', docType: 'law', tone: 'law' },
  languages: { label: 'Sprog', icon: 'Aa', description: '', pack: 'languages', docType: 'languages', tone: 'lang' },
  linguistics: { label: 'Lingvistik', icon: 'Aa', description: '', pack: 'languages', docType: 'languages', tone: 'lang' },
  translation: { label: 'Oversættelse', icon: '↔', description: '', pack: 'languages', docType: 'languages', tone: 'lang' },
  communication: { label: 'Kommunikation', icon: 'Aa', description: '', pack: 'languages', docType: 'languages', tone: 'lang' },
  rhetoric: { label: 'Retorik', icon: 'Aa', description: '', pack: 'languages', docType: 'languages', tone: 'lang' },
  foreignLanguages: { label: 'Fremmedsprog', icon: 'Aa', description: '', pack: 'languages', docType: 'languages', tone: 'lang' },
  music: { label: 'Musik', icon: '♪', description: '', pack: 'music', docType: 'music', tone: 'music' },
  art: { label: 'Kunst', icon: '◈', description: '', pack: 'music', docType: 'music', tone: 'music' },
  design: { label: 'Design', icon: '◈', description: '', pack: 'general', docType: 'general', tone: 'music' },
  film: { label: 'Film & medier', icon: '▣', description: '', pack: 'humanities', docType: 'culturalStudies', tone: 'humanities' },
  theatre: { label: 'Teater', icon: '♪', description: '', pack: 'music', docType: 'music', tone: 'music' },
  mediaStudies: { label: 'Medievidenskab', icon: '▣', description: '', pack: 'humanities', docType: 'culturalStudies', tone: 'humanities' },
};

const STUDY_FIELD_BOARD = [
  { title: 'Science', tone: 'science', icon: '⌬', ids: ['physics', 'chemistry', 'biology', 'biotechnology'] },
  { title: 'Tech', tone: 'tech', icon: '</>', ids: ['tech', 'softwareEngineering'] },
  { title: 'Engineering', tone: 'engineering', icon: '⚙', ids: ['engineering', 'electricalEngineering', 'mechanicalEngineering', 'civilEngineering', 'architecture'] },
  { title: 'Maths', tone: 'math', icon: '∑', ids: ['mathematics', 'statistics'] },
  { title: 'Mind', tone: 'psych', icon: 'Ψ', ids: ['psychology'] },
];

const STEM_STUDY_FIELD_IDS = STUDY_FIELD_BOARD.flatMap(section => section.ids);

const LEGACY_STUDY_FIELD_MAP = {
  stem: 'mathematics',
  general: 'mathematics',
  health: 'biology',
  medicine: 'biology',
  nursing: 'biology',
  pharmacology: 'chemistry',
  dentistry: 'biology',
  sportsScience: 'biology',
  economics: 'statistics',
  social: 'statistics',
  humanities: 'tech',
  history: 'tech',
  culturalStudies: 'tech',
  philosophy: 'mathematics',
  literature: 'tech',
  theology: 'tech',
  law: 'tech',
  criminology: 'statistics',
  publicLaw: 'tech',
  internationalLaw: 'tech',
  businessLaw: 'tech',
  humanRights: 'tech',
  languages: 'tech',
  linguistics: 'tech',
  translation: 'tech',
  communication: 'tech',
  rhetoric: 'tech',
  foreignLanguages: 'tech',
  music: 'tech',
  art: 'tech',
  design: 'tech',
  film: 'tech',
  theatre: 'tech',
  mediaStudies: 'tech',
};

function normalizeStudyField(value = 'mathematics') {
  if (STEM_STUDY_FIELD_IDS.includes(value)) return value;
  return LEGACY_STUDY_FIELD_MAP[value] || 'mathematics';
}

function studyFieldPack(id) {
  const normalized = normalizeStudyField(id);
  const pack = STUDY_AREA_OPTIONS[normalized]?.pack || STUDY_AREA_OPTIONS[id]?.pack || (toolPacks[id] ? id : 'general');
  return toolPacks[pack] ? pack : 'stem';
}

function studyFieldDocType(id) {
  const normalized = normalizeStudyField(id);
  return STUDY_AREA_OPTIONS[normalized]?.docType || (docTypes[normalized] ? normalized : 'general');
}

function studyAreaLabel(id) {
  const normalized = normalizeStudyField(id);
  return STUDY_AREA_OPTIONS[normalized]?.label || studyFields[id]?.label || 'Universitetsstudie';
}

const toolPacks = {
  general: {
    label: 'Universitetsværktøjer', icon: '▤',
    groups: [
      { label: 'Kilder & argument', tools: [
        ['quote', 'Citat'], ['bibliography', 'Referencer'], ['argument', 'Argumentkort'], ['researchQuestion', 'Forskningsspørgsmål'], ['citationMap', 'Citatkort'],
      ]},
      { label: 'Struktur & planlægning', tools: [
        ['timeline', 'Tidslinje'], ['table', 'Tabel'], ['swot', 'SWOT'], ['literatureReview', 'Litteraturreview'],
      ]},
      { label: 'Figurer & modeller', tools: [
        ['model', 'Alle modeller'], ['timelineFig', 'Tidslinje'], ['swotFig', 'SWOT-tavle'], ['researchFig', 'Forskningsdesign'], ['stakeholderFig', 'Interessenter'],
      ]},
    ],
    tools: [['quote', 'Citat'], ['bibliography', 'Referencer'], ['argument', 'Argumentkort'], ['timeline', 'Tidslinje'], ['table', 'Tabel'], ['researchQuestion', 'Forskningsspørgsmål'], ['swot', 'SWOT'], ['literatureReview', 'Litteraturreview'], ['citationMap', 'Citatkort'], ['model', 'Interaktiv model'], ['timelineFig', 'Tidslinje-figur'], ['swotFig', 'SWOT-tavle'], ['researchFig', 'Forskningsdesign'], ['stakeholderFig', 'Interessenter'], ['conceptMap', 'Begrebskort'], ['peerReview', 'Peer review'], ['reflectionLog', 'Refleksionslog']],
  },
  stem: {
    label: 'STEM', icon: '',
    groups: [
      { id: 'algebra', label: 'Algebra & analyse', docTypes: ['mathematics', 'physics', 'chemistry', 'engineering', 'civilEngineering', 'electricalEngineering', 'mechanicalEngineering', 'tech', 'softwareEngineering', 'biology', 'biotechnology', 'health', 'psychology', 'general'], tools: [
        ['algebra', 'Algebra'], ['calculus', 'Calculus'], ['analysis', 'Real analyse'], ['complexAnalysis', 'Kompleks analyse'],
        ['differentialEquations', 'Differentialligninger'], ['epsilonDelta', 'Epsilon-delta'], ['summation', 'Sigma & rækker'],
      ]},
      { id: 'linear', label: 'Lineær algebra & diskret', docTypes: ['mathematics', 'physics', 'engineering', 'civilEngineering', 'electricalEngineering', 'mechanicalEngineering', 'tech', 'softwareEngineering', 'psychology', 'general'], tools: [
        ['linearAlgebra', 'Lineær algebra'], ['matrix', 'Matrixberegner'], ['calculator', 'Avanceret lommeregner'], ['equationSolver', 'Ligningsløser'],
        ['discreteMath', 'Diskret matematik'], ['numberTheory', 'Talteori'], ['logic', 'Logik & beviser'], ['topology', 'Topologi'], ['geometry', 'Geometri'],
      ]},
      { id: 'probability', label: 'Sandsynlighed & numerik', docTypes: ['mathematics', 'physics', 'biology', 'medicine', 'health', 'statistics', 'psychology', 'general'], tools: [
        ['probability', 'Sandsynlighed'], ['statistics', 'Statistik'], ['numericalMethods', 'Numeriske metoder'], ['optimization', 'Optimering'],
      ]},
      { id: 'graphs', label: 'Grafer & modeller', docTypes: ['mathematics', 'physics', 'chemistry', 'engineering', 'civilEngineering', 'electricalEngineering', 'mechanicalEngineering', 'psychology', 'general'], tools: [
        ['graph', 'Grafplotter'], ['latex', 'LaTeX'], ['formula', 'Formeludtryk'], ['model', 'Interaktiv model'], ['convert', 'Konvertering'], ['siUnits', 'SI-enheder'],
      ]},
      { id: 'physics', label: 'Fysik & kvante', docTypes: ['physics', 'chemistry', 'engineering', 'electricalEngineering', 'mechanicalEngineering'], tools: [
        ['quantumMechanics', 'Kvantemekanik'], ['quantumPhysics', 'Kvantfysik'], ['mechanics', 'Mekanik'], ['integral', 'Integral'], ['derivative', 'Afledt'],
      ]},
      { id: 'practical', label: 'Laboratorium & kode', docTypes: ['physics', 'chemistry', 'biology', 'biotechnology', 'medicine', 'health', 'engineering', 'civilEngineering', 'electricalEngineering', 'mechanicalEngineering', 'tech', 'softwareEngineering', 'mathematics', 'statistics', 'psychology', 'general'], tools: [
        ['labReport', 'Laboratoriejournal'], ['circuit', 'Kredsløb'], ['draw', 'Teknisk tegning'], ['robotFlow', 'Robot-flow'], ['code', 'Kodeeditor'],
      ]},
      { id: 'models', label: 'Modeller & systemer', docTypes: ['mathematics', 'physics', 'engineering', 'tech', 'softwareEngineering', 'biology', 'psychology', 'health', 'general'], tools: [
        ['model', 'Alle modeller'], ['robotFlow', 'Robot-flow'], ['brainMap', 'Hjerne'], ['memoryModel', 'Hukommelse'], ['cognition', 'Kognition'],
        ['algorithmFig', 'Algoritme-flow'], ['dataStructFig', 'Datastruktur'], ['neuralNetFig', 'Neuralt netværk'], ['networkFig', 'Netværk'],
      ]},
      { id: 'figures', label: 'Figurer & diagrammer', docTypes: ['mathematics', 'physics', 'chemistry', 'biology', 'engineering', 'general'], tools: [
        ['cellFig', 'Celle'], ['moleculeFig', 'Molekyle'], ['photosynthesisFig', 'Fotosyntese'], ['circuitFig', 'Kredsløb'], ['mechanicsFig', 'Kræfter'],
        ['waveFig', 'Bølge'], ['geometryFig', '3D-geometri'], ['functionFig', 'Funktion'], ['probabilityFig', 'Sandsynlighed'], ['vennFig', 'Venn-diagram'],
      ]},
    ],
    tools: [
      ['algebra', 'Algebra'], ['calculus', 'Calculus'], ['linearAlgebra', 'Lineær algebra'], ['differentialEquations', 'Differentialligninger'],
      ['analysis', 'Real analyse'], ['complexAnalysis', 'Kompleks analyse'], ['probability', 'Sandsynlighed'], ['statistics', 'Statistik'],
      ['numericalMethods', 'Numeriske metoder'], ['optimization', 'Optimering'], ['geometry', 'Geometri'], ['topology', 'Topologi'],
      ['discreteMath', 'Diskret matematik'], ['numberTheory', 'Talteori'], ['logic', 'Logik og beviser'], ['matrix', 'Matrixberegner'], ['calculator', 'Avanceret lommeregner'],
      ['equationSolver', 'Ligningsløser 1. til 3. grad'], ['epsilonDelta', 'Epsilon og delta'], ['summation', 'Sigma, rækker og følger'],
      ['graph', 'Grafplotter'], ['calculator', 'Avanceret lommeregner'], ['latex', 'LaTeX'], ['formula', 'Formeludtryk'], ['model', 'Interaktiv model'],
      ['quantumMechanics', 'Kvantemekanik'], ['quantumPhysics', 'Kvantfysik'],
      ['labReport', 'Laboratoriejournal'], ['siUnits', 'Enheder'], ['convert', 'Konvertering'],
      ['mechanics', 'Mekanik'], ['integral', 'Integral'], ['derivative', 'Afledt'], ['circuit', 'Kredsløb'], ['draw', 'Teknisk tegning'],
      ['robotFlow', 'Robot-flow'], ['brainMap', 'Hjerne'], ['memoryModel', 'Hukommelse'], ['cognition', 'Kognition'],
      ['algorithmFig', 'Algoritme-flow'], ['dataStructFig', 'Datastruktur'], ['cellFig', 'Celle'], ['moleculeFig', 'Molekyle'],
      ['circuitFig', 'Kredsløb'], ['mechanicsFig', 'Kræfter'], ['waveFig', 'Bølge'], ['geometryFig', 'Geometri'], ['vennFig', 'Venn-diagram'],
      ['hypothesisTest', 'Hypotesetest'], ['conceptMap', 'Begrebskort'],
    ],
  },
  coding: {
    label: 'Kodeværktøjer', icon: '',
    groups: [
      { label: 'Kodeeditor', tools: [
        ['code', 'Kodeeditor'],
      ]},
      { label: 'Robotik & systemer', tools: [
        ['robotFlow', 'Robot-flow'], ['robotArmFig', 'Robotarm'], ['model', 'Alle modeller'], ['circuitFig', 'Kredsløb'],
        ['algorithmFig', 'Algoritme-flow'], ['dataStructFig', 'Datastruktur'], ['networkFig', 'Netværk'], ['neuralNetFig', 'Neuralt netværk'],
        ['softwareFig', 'Softwarearkitektur'], ['databaseFig', 'Database'], ['cybersecurityFig', 'Cybersikkerhed'], ['controlFig', 'Regulering'],
      ]},
      { label: 'Fejlfinding & pakker', tools: [
        ['userStory', 'User story'], ['apiDesign', 'API-design'], ['sprintPlanning', 'Sprintplan'],
      ]},
    ],
    tools: [
      ['code', 'Kodeeditor'],
      ['robotFlow', 'Robot-flow'],
      ['model', 'Alle modeller'], ['circuit', 'Kredsløb'],
      ['algorithmFig', 'Algoritme-flow'], ['dataStructFig', 'Datastruktur'], ['networkFig', 'Netværk'], ['neuralNetFig', 'Neuralt netværk'],
      ['softwareFig', 'Softwarearkitektur'], ['databaseFig', 'Database'], ['cybersecurityFig', 'Cybersikkerhed'], ['userStory', 'User story'], ['apiDesign', 'API-design'],
    ],
  },
  psychology: {
    label: 'Psykologi', icon: 'Ψ',
    groups: [
      { label: 'Modeller & neuro', tools: [
        ['brainMap', 'Hjerne'], ['memoryModel', 'Hukommelse'], ['cognition', 'Kognition'], ['model', 'Alle modeller'],
        ['maslowFig', 'Behovspyramide'], ['learningFig', 'Læringscyklus'], ['stressFig', 'Stressrespons'], ['experimentFig', 'Eksperimentforløb'],
      ]},
      { label: 'Metode & analyse', tools: [
        ['experimentDesign', 'Eksperimentdesign'], ['psychometrics', 'Psykometri'], ['statistics', 'Statistik'], ['caseStudy', 'Casestudie'], ['regression', 'Regression'], ['interview', 'Interviewguide'], ['survey', 'Spørgeskema'],
      ]},
      { label: 'Teori & forskning', tools: [
        ['theoryApply', 'Teorianvendelse'], ['researchDesign', 'Forskningsdesign'], ['ethics', 'Forskningsetik'], ['literatureReview', 'Litteraturreview'], ['code', 'Kodeeditor'],
      ]},
    ],
    tools: [['brainMap', 'Hjerne'], ['memoryModel', 'Hukommelse'], ['cognition', 'Kognition'], ['experimentDesign', 'Eksperimentdesign'], ['psychometrics', 'Psykometri'], ['theoryApply', 'Teorianvendelse'], ['statistics', 'Statistik'], ['caseStudy', 'Casestudie'], ['researchDesign', 'Forskningsdesign'], ['ethics', 'Forskningsetik'], ['literatureReview', 'Litteraturreview'], ['model', 'Alle modeller'], ['interview', 'Interviewguide'], ['survey', 'Spørgeskema'], ['qualitativeCoding', 'Kvalitativ kodning'], ['maslowFig', 'Behovspyramide'], ['learningFig', 'Læringscyklus'], ['stressFig', 'Stressrespons'], ['experimentFig', 'Eksperimentforløb'], ['metaAnalysis', 'Metaanalyse'], ['focusGroup', 'Fokusgruppe'], ['conceptMap', 'Begrebskort']],
  },
  health: {
    label: 'Sundhed', icon: '+',
    groups: [
      { label: 'Klinisk arbejde', tools: [
        ['patientCase', 'Patientcase'], ['clinicalReasoning', 'Klinisk ræsonnering'], ['diagnostics', 'Diagnostik'], ['carePlan', 'Plejeplan'], ['dosage', 'Dosering'],
      ]},
      { label: 'Videnskab & evidens', tools: [
        ['evidence', 'Evidensvurdering'], ['epidemiology', 'Epidemiologi'], ['biostatistics', 'Biostatistik'], ['pharmacology', 'Farmakologi'], ['researchDesign', 'Forskningsdesign'],
      ]},
      { label: 'Anatomi & modeller', tools: [
        ['anatomy', 'Anatomi'], ['model', 'Alle modeller'], ['labReport', 'Laboratoriejournal'], ['table', 'Observationstabel'], ['timeline', 'Forløb'],
        ['heartFig', 'Hjerte'], ['anatomyFig', 'Anatomi-figur'], ['immuneFig', 'Immunsystem'], ['cellFig', 'Celle'], ['ecosystemFig', 'Økosystem'],
        ['clinicalPathway', 'Klinisk forløb'], ['drugInteraction', 'Lægemiddelinteraktion'], ['caseSeries', 'Caseserie'],
      ]},
    ],
    tools: [['patientCase', 'Patientcase'], ['anatomy', 'Anatomi'], ['dosage', 'Dosering'], ['evidence', 'Evidensvurdering'], ['model', 'Alle modeller'], ['clinicalReasoning', 'Klinisk ræsonnering'], ['diagnostics', 'Diagnostik'], ['pharmacology', 'Farmakologi'], ['epidemiology', 'Epidemiologi'], ['biostatistics', 'Biostatistik'], ['carePlan', 'Plejeplan'], ['researchDesign', 'Forskningsdesign'], ['labReport', 'Laboratoriejournal'], ['table', 'Observationstabel'], ['timeline', 'Forløb'], ['heartFig', 'Hjerte'], ['anatomyFig', 'Anatomi-figur'], ['immuneFig', 'Immunsystem'], ['cellFig', 'Celle'], ['clinicalPathway', 'Klinisk forløb'], ['drugInteraction', 'Lægemiddelinteraktion'], ['caseSeries', 'Caseserie'], ['systematicReview', 'Systematisk review']],
  },
  other: { label: 'Andre værktøjer', icon: '…', tools: [] },
};

const widgetPresets = {
  mathematics: {
    graphNodes: ['Algebra', 'Integral', 'Matrix', 'Graf', 'Statistik'],
    codeLang: 'Python', codeSnippet: 'def f(x):\n    return x ** 2',
    hwIcon: '∑',
    aiPrompt: 'Hvordan kan jeg hjælpe med matematikken?',
    aiActions: [
      { icon: '∑', label: 'Forklar denne ligning', action: 'explain' },
      { icon: '∫', label: 'Vis udledning', action: 'derive' },
      { icon: '?', label: 'Lav en quiz', action: 'questions' },
      { icon: '≡', label: 'Find relevante formler', action: 'explain' },
    ],
    tools: [
      { icon: '∑', label: 'Formelbibliotek', tool: 'formula' },
      { icon: '↗', label: 'Plotter', tool: 'graph' },
      { icon: '▦', label: 'Matrix Cal.', tool: 'matrix' },
      { icon: '</>', label: 'Kodeeditor', tool: 'code' },
      { icon: '▦', label: 'Statistik', tool: 'statistics' },
    ],
  },
  physics: {
    graphNodes: ['Teori', 'Enheder', 'Forsøg', 'Graf', 'Resultater'],
    codeLang: 'Python', codeSnippet: 'import numpy as np\n# fysik beregning',
    hwIcon: '⚛',
    aiPrompt: 'Spørg om fysik, enheder og forsøg.',
    aiActions: [
      { icon: '∑', label: 'Forklar denne ligning', action: 'explain' },
      { icon: '⚖', label: 'Tjek enheder', action: 'proofread' },
      { icon: '?', label: 'Lav en quiz', action: 'questions' },
      { icon: '≡', label: 'Find relevante formler', action: 'explain' },
    ],
    tools: [
      { icon: '∑', label: 'Formelbibliotek', tool: 'formula' },
      { icon: '↗', label: 'Plotter', tool: 'graph' },
      { icon: '⚖', label: 'SI enheder', tool: 'siUnits' },
      { icon: '⚗', label: 'Forsøgsrapport', tool: 'labReport' },
      { icon: '</>', label: 'Kodeeditor', tool: 'code' },
    ],
  },
  tech: {
    graphNodes: ['Sensor', 'Perception', 'Planlægning', 'Styring', 'Feedback'],
    codeLang: 'Arduino', codeSnippet: 'void setup() {\n  Serial.begin(9600);\n}',
    hwIcon: '▣',
    aiPrompt: 'Hvordan kan jeg hjælpe dig i dag?',
    aiActions: [
      { icon: '∑', label: 'Forklar denne ligning', action: 'explain' },
      { icon: '</>', label: 'Optimer denne kode', action: 'debug' },
      { icon: '?', label: 'Lav en quiz', action: 'questions' },
      { icon: '≡', label: 'Find relevante formler', action: 'explain' },
    ],
    tools: [
      { icon: 'R', label: 'Robot-flow', tool: 'robotFlow' },
      { icon: '</>', label: 'Kodeeditor', tool: 'code' },
      { icon: '▦', label: 'Matrix Cal.', tool: 'matrix' },
      { icon: '↗', label: 'Plotter', tool: 'graph' },
      { icon: '◉', label: 'Model', tool: 'model' },
    ],
  },
  engineering: {
    graphNodes: ['Kredsløb', 'Komponenter', 'Beregning', 'Arduino', 'Simulering'],
    codeLang: 'Arduino', codeSnippet: 'void setup() {\n  Serial.begin(9600);\n}',
    hwIcon: '⚡',
    aiPrompt: 'Hjælp til elektronik og kredsløb.',
    aiActions: [
      { icon: '⚡', label: 'Forklar kredsløb', action: 'explain' },
      { icon: '</>', label: 'Optimer kode', action: 'debug' },
      { icon: '?', label: 'Lav en quiz', action: 'questions' },
      { icon: '≡', label: 'Find formler', action: 'explain' },
    ],
    tools: [
      { icon: '⚡', label: 'Kredsløb', tool: 'circuit' },
      { icon: '↗', label: 'Plotter', tool: 'graph' },
      { icon: '</>', label: 'Kodeeditor', tool: 'code' },
      { icon: '⚖', label: 'Enhedskonverter', tool: 'convert' },
      { icon: '☁', label: 'CAD Viewer', tool: 'draw' },
    ],
  },
  chemistry: {
    graphNodes: ['Reaktion', 'Støkiometri', 'Enheder', 'Forsøg', 'Resultat'],
    codeLang: 'Python', codeSnippet: '# kemisk beregning\nmol = 2.5',
    hwIcon: '⚗',
    aiPrompt: 'Spørg om kemi og reaktioner.',
    aiActions: [
      { icon: '∑', label: 'Forklar formel', action: 'explain' },
      { icon: '⚗', label: 'Tjek reaktion', action: 'proofread' },
      { icon: '?', label: 'Lav en quiz', action: 'questions' },
      { icon: '≡', label: 'Find formler', action: 'explain' },
    ],
    tools: [
      { icon: '∑', label: 'Formler', tool: 'formula' },
      { icon: 'LaTeX', label: 'LaTeX', tool: 'latex' },
      { icon: '⚗', label: 'Lab rapport', tool: 'labReport' },
      { icon: '⚖', label: 'SI enheder', tool: 'siUnits' },
      { icon: '</>', label: 'Kodeeditor', tool: 'code' },
    ],
  },
  general: {
    graphNodes: ['Hovedpointer', 'Noter', 'Opsummering', 'Spørgsmål', 'Links'],
    codeLang: null, codeSnippet: '',
    hwIcon: '▤',
    aiPrompt: 'Hvordan kan jeg hjælpe med dine noter?',
    aiActions: [
      { icon: 'Aa', label: 'Forklar teksten', action: 'explain' },
      { icon: '✓', label: 'Ret stavning', action: 'proofread' },
      { icon: '?', label: 'Lav en quiz', action: 'questions' },
      { icon: '≡', label: 'Lav resumé', action: 'summarize' },
    ],
    tools: [
      { icon: 'H', label: 'Overskrift', tool: 'heading' },
      { icon: '•', label: 'Liste', tool: 'bulletList' },
      { icon: '☐', label: 'Tjekliste', tool: 'checklist' },
      { icon: '</>', label: 'Kodeeditor', tool: 'code' },
      { icon: 'PDF', label: 'PDF citat', tool: 'pdf' },
    ],
  },
};

Object.assign(widgetPresets, {
  psychology: {
    ...widgetPresets.general,
    graphNodes: ['Hjerne', 'Kognition', 'Adfærd', 'Metode', 'Teori'],
    aiPrompt: 'Spørg om hjerne, kognition, adfærd og psykologisk metode.',
    aiActions: [
      { icon: 'Ψ', label: 'Forklar begrebet', action: 'explain' },
      { icon: '◉', label: 'Åbn hjerne-model', action: 'explain' },
      { icon: '?', label: 'Lav en quiz', action: 'questions' },
      { icon: '✓', label: 'Tjek min forståelse', action: 'proofread' },
    ],
    tools: [
      { icon: 'Ψ', label: 'Hjerne-model', tool: 'brainMap' },
      { icon: '◎', label: 'Hukommelse', tool: 'memoryModel' },
      { icon: '↻', label: 'Kognition', tool: 'cognition' },
      { icon: '</>', label: 'Kodeeditor', tool: 'code' },
    ],
  },
  interdisciplinary: { ...widgetPresets.general, aiPrompt: 'Hvad vil du arbejde videre med?' },
  other: { ...widgetPresets.general, aiPrompt: 'Hvad vil du have hjælp til i denne note?' },
  health: {
    ...widgetPresets.general,
    graphNodes: ['Anamnese', 'Observation', 'Evidens', 'Intervention', 'Evaluering'],
    aiPrompt: 'Spørg om sundhedsfaglig teori, evidens og cases.',
    tools: [{ icon: '+', label: 'Patientcase', tool: 'patientCase' }, { icon: '◉', label: 'Anatomi', tool: 'anatomy' }, { icon: 'E', label: 'Evidens', tool: 'evidence' }, { icon: '</>', label: 'Kodeeditor', tool: 'code' }],
  },
});

const expectationLabels = ['', 'Minimal', 'Let', 'Medium', 'Høj', 'Maksimal'];

const blank = {
  semesters: [], subjects: [], pages: [], trash: [], projects: [], groups: [], resources: [],
  currentSubject: null, currentPage: null,
  ui: { projectsOpen: false, resourcesOpen: false, widgetsOpen: true, toolbarExpanded: false, capabilitiesFirstOpen: false, programOpen: {}, semesterOpen: {}, subjectOpen: {}, view: 'notebook', notebookIndex: 0 },
};

let data = normalize(load());
let selectedColor = colors[0];
let selectedNotebookColor = '#34312e';
let selectedStickyColor = '#f4dfa2';
let saveTimer;
let widgetsTimer;
let paginationTimer;
let editorRange = null;
let autoCorrectTimer;
let autoCorrectBusy = false;
let proofreadingTimer;
let selectedExamPreset = 'mixed';
let crossPageBackspaceTimer;
let crossPageBackspaceHeld = false;
let pendingFullDocumentSelectAll = false;
let pendingFullNoteDelete = false;
let universityToolAbort = null;
let helperRange = null;
let helperText = '';
let noteExamState = { cards: [], index: 0, revealed: false };
let guestNoticeTimer;
let guestEditReady = false;
let appBooted = false;
let lastContinuousEditorSheet = 0;

const $ = s => document.querySelector(s);
const NOTEIT_APP_VERSION = '2.26.0';
const REWARD_AMOUNTS = { planCheck: 2, trainingDone: 3, noteCreated: 1 };
let studyHelpConnection = 'online';
let onboardingStep = 0;
let onboardingMode = 'intro';

const STARTUP_GUIDE_STEPS = [
  {
    scene: 'notebook',
    title: 'Opret fag',
    lead: 'Start i venstre side under NOTER+.',
    bullets: [
      'Tryk <strong>+</strong> og vælg notesbog',
      'Tilføj fag — fx Matematik',
      'Klik på <strong>faget</strong> for at åbne',
    ],
  },
  {
    scene: 'paper',
    title: 'Opret note',
    lead: 'Tryk + ved faget — så kommer noten.',
    bullets: [
      'Vælg layout (linjer, Cornell…)',
      'Noten vises i listen bagefter',
    ],
  },
  {
    scene: 'write',
    title: 'Skriv',
    lead: 'Brug værktøjslinjen over papiret.',
    bullets: [
      'Overskrifter, fed, formler og kode',
      '<strong>Værktøjer ▾</strong> til dit fag',
    ],
  },
  {
    scene: 'study',
    title: 'Studiehjælp',
    lead: 'Hjælp til forståelse — ikke stavekontrol.',
    bullets: [
      '<strong>✦ Studiehjælp ▾</strong> eller markér tekst',
      'PDF og flashcards i sidepanelet',
    ],
  },
  {
    scene: 'exam',
    title: 'Eksamen',
    lead: 'Plan og træning i sidepanelet.',
    bullets: [
      '<strong>Eksamensplan</strong> og <strong>Eksamenstræning</strong>',
      'God studielyst!',
    ],
  },
];

function guideBoardSceneSvg(scene) {
  const chalk = 'chalk-stroke';
  const scenes = {
    welcome: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <rect class="chalk-fill fade-in" x="40" y="30" width="100" height="130" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <path class="${chalk}" d="M55 55h70M55 75h55M55 95h65M55 115h40"/>
      <circle class="${chalk}" cx="210" cy="90" r="42"/>
      <path class="${chalk}" d="M195 90h30M210 75v30"/>
      <text class="chalk-text pop-in" x="160" y="168" text-anchor="middle" font-size="14">Note'it</text>
    </svg>`,
    notebook: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <path class="${chalk}" d="M60 40h120v120H60z"/>
      <path class="${chalk}" d="M80 40v120"/>
      <path class="${chalk}" d="M70 60h90M70 80h90M70 100h70"/>
      <circle class="${chalk} pop-in d1" cx="230" cy="60" r="22"/>
      <path class="${chalk} pop-in d1" d="M222 60h16M230 52v16"/>
      <text class="chalk-label pop-in d2" x="230" y="100" text-anchor="middle">+ fag</text>
    </svg>`,
    paper: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <path class="${chalk}" d="M90 35l80-15 90 25v115l-90 20-80-15z"/>
      <path class="${chalk}" d="M170 20v115"/>
      <path class="${chalk}" d="M105 70h150M105 90h130M105 110h140"/>
      <rect class="chalk-fill pop-in d1" x="95" y="130" width="70" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
      <text class="chalk-label pop-in d2" x="130" y="145" text-anchor="middle" font-size="11">nyt papir</text>
    </svg>`,
    views: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <g class="pop-in"><rect class="${chalk}" x="35" y="50" width="55" height="70" rx="3"/><text class="chalk-label" x="62" y="135" text-anchor="middle" font-size="9">Spiral</text></g>
      <g class="pop-in d1"><rect class="${chalk}" x="100" y="45" width="55" height="70" rx="3"/><line class="${chalk}" x1="100" y1="60" x2="155" y2="60"/><text class="chalk-label" x="127" y="135" text-anchor="middle" font-size="9">Opdelt</text></g>
      <g class="pop-in d2"><rect class="${chalk}" x="165" y="48" width="55" height="66" rx="3"/><rect class="${chalk}" x="172" y="55" width="55" height="66" rx="3" opacity=".5"/><text class="chalk-label" x="200" y="135" text-anchor="middle" font-size="9">Stak</text></g>
      <g class="pop-in d3"><path class="${chalk}" d="M240 55h65v8H240z"/><path class="${chalk}" d="M240 55v70"/><text class="chalk-label" x="272" y="135" text-anchor="middle" font-size="9">Langt</text></g>
    </svg>`,
    write: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <rect class="${chalk}" x="40" y="55" width="240" height="44" rx="8"/>
      <text class="chalk-label pop-in" x="58" y="82" font-size="16" font-weight="700">H1</text>
      <text class="chalk-label pop-in d1" x="92" y="82" font-size="16" font-weight="700">B</text>
      <text class="chalk-label pop-in d1" x="118" y="82" font-size="16" font-style="italic">I</text>
      <text class="chalk-label pop-in d2" x="148" y="82" font-size="18">∑</text>
      <text class="chalk-label pop-in d2" x="178" y="82" font-size="18">∫</text>
      <text class="chalk-label pop-in d3" x="208" y="82" font-size="14">&lt;/&gt;</text>
      <path class="${chalk} pop-in d3" d="M70 120h180M70 135h140M70 150h160"/>
    </svg>`,
    tools: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <rect class="${chalk}" x="50" y="45" width="220" height="90" rx="10"/>
      <circle class="${chalk} pop-in" cx="90" cy="85" r="18"/>
      <path class="${chalk} pop-in d1" d="M130 70h40v30h-40z"/>
      <path class="${chalk} pop-in d1" d="M190 75c15 0 25 10 25 22s-10 22-25 22"/>
      <path class="${chalk} pop-in d2" d="M240 68l20 34-20 14z"/>
      <text class="chalk-label pop-in d3" x="160" y="155" text-anchor="middle">Værktøjer ▾</text>
    </svg>`,
    study: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <path class="${chalk}" d="M160 35l18 52h54l-44 32 17 54-45-33-45 33 17-54-44-32h54z"/>
      <rect class="${chalk} pop-in d1" x="55" y="120" width="210" height="40" rx="6"/>
      <text class="chalk-label pop-in d2" x="160" y="145" text-anchor="middle" font-size="12">✦ Studiehjælp</text>
    </svg>`,
    flashcards: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <rect class="${chalk} pop-in" x="70" y="50" width="90" height="60" rx="6" transform="rotate(-8 115 80)"/>
      <rect class="${chalk} pop-in d1" x="150" y="55" width="90" height="60" rx="6" transform="rotate(6 195 85)"/>
      <text class="chalk-label pop-in d2" x="115" y="85" text-anchor="middle" font-size="11">?</text>
      <text class="chalk-label pop-in d3" x="195" y="88" text-anchor="middle" font-size="10">svar</text>
      <path class="${chalk} pop-in d3" d="M130 130h60" marker-end="url(#arrow)"/>
      <text class="chalk-label pop-in d3" x="160" y="155" text-anchor="middle" font-size="10">PDF → kort</text>
    </svg>`,
    exam: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <rect class="${chalk}" x="70" y="40" width="180" height="110" rx="8"/>
      <path class="${chalk}" d="M70 65h180"/>
      <g class="pop-in d1">${[0,1,2,3,4,5].map(i => `<rect class="chalk-fill" x="${88 + (i%3)*52}" y="${78 + Math.floor(i/3)*32}" width="38" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>`).join('')}</g>
      <path class="${chalk} pop-in d2" d="M100 145l20-12 20 8 30-18"/>
      <text class="chalk-label pop-in d3" x="160" y="168" text-anchor="middle" font-size="10">plan + træn</text>
    </svg>`,
    ready: `<svg viewBox="0 0 320 180" class="guide-svg" aria-hidden="true">
      <circle class="${chalk} pop-in" cx="160" cy="85" r="50"/>
      <path class="${chalk} pop-in d1" d="M135 85l20 20 40-45"/>
      <path class="${chalk} pop-in d2" d="M60 40l15 8M260 50l-12 10M70 150l10-12M250 140l14 6"/>
      <text class="chalk-text pop-in d3" x="160" y="165" text-anchor="middle" font-size="15">Klar til pensum!</text>
    </svg>`,
  };
  return scenes[scene] || scenes.welcome;
}

function renderGuideIntroArt(scene = 'welcome') {
  const host = $('#onboardingIntroArt');
  if (!host) return;
  host.innerHTML = guideBoardSceneSvg(scene);
  host.classList.remove('draw-play');
  void host.offsetWidth;
  host.classList.add('draw-play');
}
const NOTEIT_STUDY_MODEL = 'OpenAI gpt-4.1-mini via sikker serverfunktion';
const DEFAULT_CURSOR_API_ENDPOINT = '/api/study-help';
let aiSettings = { model: 'gpt-4.1-mini' };
localStorage.removeItem('stemnotes-ai');
let appSettings = JSON.parse(scopedStorage('settings', 'stemnotes-settings') || '{"interfaceLanguage":"da","defaultLanguage":"da","country":"DK","autoCorrect":true,"studyField":"mathematics"}');
if (!appSettings.country) appSettings.country = 'DK';
if (appSettings.autoCorrect === undefined) appSettings.autoCorrect = true;
appSettings.studyField = normalizeStudyField(appSettings.studyField);
appSettings.apiBase = String(appSettings.apiBase || localStorage.getItem('noteit-api-base') || '').replace(/\/$/, '');
if (!Array.isArray(appSettings.recentTools)) appSettings.recentTools = [];
let examData = JSON.parse(scopedStorage('exams', 'stemnotes-exams') || '{"subjects":[],"start":"","plan":[],"checks":{},"folders":[],"trainingResults":[]}');
examData.subjects = (examData.subjects || []).map(subject => ({
  files: [],
  questions: [],
  topics: [],
  ...subject,
}));
examData.view ||= 'checklist';
let pendingExamFiles = [];
if (!Array.isArray(examData.folders)) examData.folders = [];
if (!Array.isArray(examData.trainingResults)) examData.trainingResults = [];
if (!Array.isArray(examData.rewardedPeriods)) examData.rewardedPeriods = [];
if (!Array.isArray(examData.selfNotes)) examData.selfNotes = [];
if (!Array.isArray(examData.flashcardSets)) examData.flashcardSets = [];
if (!Array.isArray(examData.paperTrainingHistory)) examData.paperTrainingHistory = [];
if (!examData.synopsisDrafts) examData.synopsisDrafts = {};
if (!examData.synopsisPdf) examData.synopsisPdf = null;

function ensureExamDataShape() {
  examData.subjects = (examData.subjects || []).map(subject => ({ files: [], questions: [], topics: [], literature: [], ...subject }));
  examData.view ||= 'checklist';
  examData.folders ||= [];
  examData.trainingResults ||= [];
  examData.rewardedPeriods ||= [];
  examData.selfNotes ||= [];
  examData.flashcardSets ||= [];
  examData.paperTrainingHistory ||= [];
  if (examData.lastTrainingSubjectId) selectedPaperTrainingSubjectId = examData.lastTrainingSubjectId;
  examData.checks ||= {};
  examData.plan ||= [];
  if (!examData.synopsisDrafts || typeof examData.synopsisDrafts !== 'object') examData.synopsisDrafts = {};
  if (!examData.synopsisDrafts.default) examData.synopsisDrafts.default = {};
}
ensureExamDataShape();
let rewardData = JSON.parse(scopedStorage('rewards', 'noteit-rewards') || '{"points":10,"earned":0,"redeemed":0,"codes":[]}');
rewardData.points = Number(rewardData.points) || 10;
let activeExamQuiz = null;
let pendingPastedImage = null;
let activeWritingTool = { type: 'pointer', color: '' };
let activeGroupId = null;
let activeGroupTool = null;
let activeProjectId = null;
let activeProjectTool = null;
let selectedExamActivity = null;
let selectedExamActivityTab = 'overview';
let paperTrainingState = null;
let selectedPaperTrainingSubjectId = null;
let selectedExamPlanSubject = null;
let selectedExamPlanTab = 'plan';
const NOTED_ACCESS_CODES = {
  'NOTED-WEEK-8Q2M': { plan: 'week', label: 'Premium i 1 uge', days: 7 },
  'NOTED-MONTH-4K9P': { plan: 'month-code', label: 'Premium i 1 måned', days: 31 },
  'NOTED-SEM-26X7': { plan: 'semester-code', label: 'Premium i 1 semester', days: 183 },
  'NOTED-STUDY-6YRS': { plan: 'study', label: 'Premium til hele studiet', days: 2192 },
  'NOTED-STAFF-LIFETIME': { plan: 'staff', label: 'Medarbejder Premium', lifetime: true },
  'NOTED-20OFF-R7K3': { plan: 'discount', label: '20 % rabat', discountPercent: 20 },
};

const languages = [
  { code: 'da', name: 'Dansk' }, { code: 'en', name: 'English' }, { code: 'sv', name: 'Svenska' },
  { code: 'no', name: 'Norsk' }, { code: 'de', name: 'Deutsch' }, { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' }, { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' }, { code: 'fi', name: 'Suomi' }, { code: 'is', name: 'Íslenska' },
  { code: 'pl', name: 'Polski' }, { code: 'cs', name: 'Čeština' }, { code: 'sk', name: 'Slovenčina' },
  { code: 'hu', name: 'Magyar' }, { code: 'ro', name: 'Română' }, { code: 'bg', name: 'Български' },
  { code: 'el', name: 'Ελληνικά' }, { code: 'tr', name: 'Türkçe' }, { code: 'uk', name: 'Українська' },
  { code: 'ru', name: 'Русский' }, { code: 'ar', name: 'العربية' }, { code: 'he', name: 'עברית' },
  { code: 'hi', name: 'हिन्दी' }, { code: 'bn', name: 'বাংলা' }, { code: 'ur', name: 'اردو' },
  { code: 'fa', name: 'فارسی' }, { code: 'zh-CN', name: '中文（简体）' }, { code: 'zh-TW', name: '中文（繁體）' },
  { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' }, { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' }, { code: 'id', name: 'Bahasa Indonesia' }, { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'sw', name: 'Kiswahili' }, { code: 'af', name: 'Afrikaans' }, { code: 'ca', name: 'Català' },
  { code: 'et', name: 'Eesti' }, { code: 'lv', name: 'Latviešu' }, { code: 'lt', name: 'Lietuvių' },
];

const countries = [
  ['DK','Danmark'], ['SE','Sverige'], ['NO','Norge'], ['FI','Finland'], ['IS','Island'],
  ['GB','Storbritannien'], ['US','USA'], ['CA','Canada'], ['AU','Australien'], ['NZ','New Zealand'],
  ['DE','Tyskland'], ['FR','Frankrig'], ['ES','Spanien'], ['IT','Italien'], ['NL','Nederlandene'],
  ['BE','Belgien'], ['CH','Schweiz'], ['AT','Østrig'], ['PL','Polen'], ['CZ','Tjekkiet'],
  ['PT','Portugal'], ['GR','Grækenland'], ['TR','Tyrkiet'], ['UA','Ukraine'], ['IN','Indien'],
  ['CN','Kina'], ['JP','Japan'], ['KR','Sydkorea'], ['BR','Brasilien'], ['MX','Mexico'],
  ['ZA','Sydafrika'], ['AE','Forenede Arabiske Emirater'], ['OTHER','Andet land'],
];

const stemI18n = {
  da: {
    studyHelp: 'Studiehjælp', explain: 'Forklar', summary: 'Resumé', examQ: 'Eksamensspørgsmål',
    proofread: 'Ret tekst', pdf: 'PDF citat', flashcard: 'Flashcard', exam: '📅 Eksamen',
    more: 'Flere ▾', less: 'Færre ▴', formula: 'Formel', latex: 'LaTeX', code: 'Kode',
    hint: 'Tip: Skriv 2^2 for opløftning · 2_2 for sænkning',
    subjects: { mathematics: 'Matematik', tech: 'Teknologi', physics: 'Fysik', chemistry: 'Kemi', engineering: 'Elektronik', document: 'Dokument', format: 'Format' },
    tools: {
      formula: 'Formel', latex: 'LaTeX', code: 'Kode',
      matrix: 'Matrix', algebra: 'Algebra', angles: 'Vinkler', integral: 'Integral', derivative: 'Afledt',
      statistics: 'Statistik', graph: 'Graf', matlab: 'MATLAB', python: 'Python', javascript: 'JavaScript',
      cpp: 'C++', arduino: 'Arduino', sql: 'SQL', html: 'HTML', algorithm: 'Algoritme', table: 'Tabel',
      siUnits: 'SI enheder', convert: 'Omregn', labReport: 'Forsøgsrapport', circuit: 'Kredsløb',
      calculator: 'Lommeregner', heading: 'Overskrift', bulletList: '• Liste', orderedList: '1. Liste',
      quote: 'Citat', checklist: 'Tjekliste', hr: 'Linje', draw: 'Tegn', model: '3D model', removeFormat: 'Fjern format',
    },
  },
  en: {
    studyHelp: 'Study help', explain: 'Explain', summary: 'Summary', examQ: 'Exam questions',
    proofread: 'Proofread', pdf: 'PDF quote', flashcard: 'Flashcard', exam: '📅 Exam',
    more: 'More ▾', less: 'Less ▴', formula: 'Formula', latex: 'LaTeX', code: 'Code',
    hint: 'Tip: Type 2^2 for superscript · 2_2 for subscript',
    subjects: { mathematics: 'Mathematics', tech: 'Tech', physics: 'Physics', chemistry: 'Chemistry', engineering: 'Electronics', document: 'Document', format: 'Format' },
    tools: {
      formula: 'Formula', latex: 'LaTeX', code: 'Code',
      matrix: 'Matrix', algebra: 'Algebra', angles: 'Angles', integral: 'Integral', derivative: 'Derivative',
      statistics: 'Statistics', graph: 'Graph', matlab: 'MATLAB', python: 'Python', javascript: 'JavaScript',
      cpp: 'C++', arduino: 'Arduino', sql: 'SQL', html: 'HTML', algorithm: 'Algorithm', table: 'Table',
      siUnits: 'SI units', convert: 'Convert', labReport: 'Lab report', circuit: 'Circuit',
      calculator: 'Calculator', heading: 'Heading', bulletList: '• List', orderedList: '1. List',
      quote: 'Quote', checklist: 'Checklist', hr: 'Line', draw: 'Draw', model: '3D model', removeFormat: 'Clear format',
    },
  },
  sv: {
    studyHelp: 'Studiehjälp', explain: 'Förklara', summary: 'Sammanfattning', examQ: 'Tentamensfrågor',
    proofread: 'Rätta text', pdf: 'PDF citat', flashcard: 'Flashcard', exam: '📅 Tentamen',
    more: 'Mer ▾', less: 'Mindre ▴', formula: 'Formel', latex: 'LaTeX', code: 'Kod',
    hint: 'Tips: Skriv 2^2 för upphöjt · 2_2 för nedsänkt',
    subjects: { mathematics: 'Matematik', tech: 'Teknik', physics: 'Fysik', chemistry: 'Kemi', engineering: 'Elektronik', document: 'Dokument', format: 'Format' },
    tools: {
      formula: 'Formel', latex: 'LaTeX', code: 'Kod',
      matrix: 'Matris', algebra: 'Algebra', angles: 'Vinklar', integral: 'Integral', derivative: 'Derivata',
      statistics: 'Statistik', graph: 'Graf', matlab: 'MATLAB', python: 'Python', javascript: 'JavaScript',
      cpp: 'C++', arduino: 'Arduino', sql: 'SQL', html: 'HTML', algorithm: 'Algoritm', table: 'Tabell',
      siUnits: 'SI-enheter', convert: 'Omvandla', labReport: 'Labbrapport', circuit: 'Kretsschema',
      calculator: 'Miniräknare', heading: 'Rubrik', bulletList: '• Lista', orderedList: '1. Lista',
      quote: 'Citat', checklist: 'Checklista', hr: 'Linje', draw: 'Rita', model: '3D-modell', removeFormat: 'Ta bort format',
    },
  },
  no: {
    studyHelp: 'Studiehjel', explain: 'Forklar', summary: 'Sammendrag', examQ: 'Eksamensspørsmål',
    proofread: 'Rette tekst', pdf: 'PDF-sitat', flashcard: 'Flashcard', exam: '📅 Eksamen',
    more: 'Mer ▾', less: 'Mindre ▴', formula: 'Formel', latex: 'LaTeX', code: 'Kode',
    hint: 'Tips: Skriv 2^2 for hevet · 2_2 for senket',
    subjects: { mathematics: 'Matematikk', tech: 'Teknologi', physics: 'Fysikk', chemistry: 'Kjemi', engineering: 'Elektronikk', document: 'Dokument', format: 'Format' },
    tools: {
      formula: 'Formel', latex: 'LaTeX', code: 'Kode',
      matrix: 'Matrise', algebra: 'Algebra', angles: 'Vinkler', integral: 'Integral', derivative: 'Derivert',
      statistics: 'Statistikk', graph: 'Graf', matlab: 'MATLAB', python: 'Python', javascript: 'JavaScript',
      cpp: 'C++', arduino: 'Arduino', sql: 'SQL', html: 'HTML', algorithm: 'Algoritme', table: 'Tabell',
      siUnits: 'SI-enheter', convert: 'Omregne', labReport: 'Laboratorierapport', circuit: 'Krets',
      calculator: 'Kalkulator', heading: 'Overskrift', bulletList: '• Liste', orderedList: '1. Liste',
      quote: 'Sitat', checklist: 'Sjekkliste', hr: 'Linje', draw: 'Tegn', model: '3D-modell', removeFormat: 'Fjern format',
    },
  },
  fr: {
    studyHelp: 'Aide aux études', explain: 'Expliquer', summary: 'Résumé', examQ: "Questions d'examen",
    proofread: 'Corriger', pdf: 'Citation PDF', flashcard: 'Flashcard', exam: '📅 Examen',
    more: 'Plus ▾', less: 'Moins ▴', formula: 'Formule', latex: 'LaTeX', code: 'Code',
    hint: 'Astuce : tapez 2^2 pour exposant · 2_2 pour indice',
    subjects: { mathematics: 'Mathématiques', tech: 'Technologie', physics: 'Physique', chemistry: 'Chimie', engineering: 'Électronique', document: 'Document', format: 'Format' },
    tools: {
      formula: 'Formule', latex: 'LaTeX', code: 'Code',
      matrix: 'Matrice', algebra: 'Algèbre', angles: 'Angles', integral: 'Intégrale', derivative: 'Dérivée',
      statistics: 'Statistiques', graph: 'Graphique', matlab: 'MATLAB', python: 'Python', javascript: 'JavaScript',
      cpp: 'C++', arduino: 'Arduino', sql: 'SQL', html: 'HTML', algorithm: 'Algorithme', table: 'Tableau',
      siUnits: 'Unités SI', convert: 'Convertir', labReport: 'Rapport de labo', circuit: 'Circuit',
      calculator: 'Calculatrice', heading: 'Titre', bulletList: '• Liste', orderedList: '1. Liste',
      quote: 'Citation', checklist: 'Checklist', hr: 'Ligne', draw: 'Dessiner', model: 'Modèle 3D', removeFormat: 'Effacer format',
    },
  },
  es: {
    studyHelp: 'Ayuda de estudio', explain: 'Explicar', summary: 'Resumen', examQ: 'Preguntas de examen',
    proofread: 'Corregir', pdf: 'Cita PDF', flashcard: 'Flashcard', exam: '📅 Examen',
    more: 'Más ▾', less: 'Menos ▴', formula: 'Fórmula', latex: 'LaTeX', code: 'Código',
    hint: 'Consejo: escribe 2^2 para superíndice · 2_2 para subíndice',
    subjects: { mathematics: 'Matemáticas', tech: 'Tecnología', physics: 'Física', chemistry: 'Química', engineering: 'Electrónica', document: 'Documento', format: 'Formato' },
    tools: {
      formula: 'Fórmula', latex: 'LaTeX', code: 'Código',
      matrix: 'Matriz', algebra: 'Álgebra', angles: 'Ángulos', integral: 'Integral', derivative: 'Derivada',
      statistics: 'Estadística', graph: 'Gráfica', matlab: 'MATLAB', python: 'Python', javascript: 'JavaScript',
      cpp: 'C++', arduino: 'Arduino', sql: 'SQL', html: 'HTML', algorithm: 'Algoritmo', table: 'Tabla',
      siUnits: 'Unidades SI', convert: 'Convertir', labReport: 'Informe de lab', circuit: 'Circuito',
      calculator: 'Calculadora', heading: 'Encabezado', bulletList: '• Lista', orderedList: '1. Lista',
      quote: 'Cita', checklist: 'Checklist', hr: 'Línea', draw: 'Dibujar', model: 'Modelo 3D', removeFormat: 'Quitar formato',
    },
  },
};

const uiI18n = {
  da: {
    home: 'Hjem', search: 'Søgning', aiAssistant: 'Studiehjælp', flashcards: 'Flashcards', graphView: 'Grafvisning',
    notes: 'NOTER', projects: 'PROJEKTER', resources: 'RESSOURCER',
    addSubject: '+ Opret fag', addSemester: '+ Nyt semester', addProject: '+ Nyt projekt',
    bachelor: 'Bachelor', master: 'Master', semester: 'Semester',
    newSemester: 'Tilføj semester', pickSemester: 'Vælg Bachelor (1 til 6) eller Master (1 til 2)',
    noSubjects: 'Ingen fag i dette semester.', createSubject: 'Opret dit første fag.',
    cancel: 'Annuller', examPlan: '📅 Eksamensplan', emailNotes: 'Send note via email',
    settings: 'Indstillinger', guide: 'Vis introduktion', searchPlaceholder: 'Søg i noter...', synced: 'Synkroniseret',
    groupWork: 'Gruppearbejde', examPreparation: 'Eksamenstræning', logout: 'Log ud',
    startSubject: 'Start fag', newSubject: 'Opret fag', subject: 'Fag', subjectColor: 'Fagfarve',
    subjectHint: 'Faget lægges som et separat papir i notesbogen og organiseres automatisk under Noter+.',
    startNotebook: 'Start notesbog', createNotebook: '+ Opret ny notesbog', deleteNotebook: 'Slet notesbog',
    notebookInstruction: 'Hold musen over et papir, og klik for at åbne det tilknyttede fag.',
    notebookCount: 'Notesbog', of: 'af', notesOne: 'note', notesMany: 'noter',
    professionalBachelor: 'Professionsbachelor', phd: 'Ph.d.',
    deleteNotebookFirst: 'Vil du slette notesbogen og alle dens fag og noter?',
    deleteNotebookAgain: 'Er du helt sikker? Handlingen kan ikke fortrydes.',
    projectsAndGroupWork: 'Projekter & gruppearbejde', comingSoonBadge: 'Kommer snart',
    comingSoonMessage: 'Projekter og gruppearbejde er på vej og kommer snart!',
  },
  en: {
    home: 'Home', search: 'Search', aiAssistant: 'AI Assistant', flashcards: 'Flashcards', graphView: 'Graph view',
    notes: 'NOTES', projects: 'PROJECTS', resources: 'RESOURCES',
    addSubject: '+ Add subject', addSemester: '+ New semester', addProject: '+ New project',
    bachelor: 'Bachelor', master: 'Master', semester: 'Semester',
    newSemester: 'Add semester', pickSemester: 'Choose Bachelor (1 til 6) or Master (1 til 2)',
    noSubjects: 'No subjects in this semester.', createSubject: 'Create your first subject.',
    cancel: 'Cancel', examPlan: '📅 Exam plan', emailNotes: 'Email note', settings: 'Settings', guide: 'Show introduction',
    searchPlaceholder: 'Search notes...', synced: 'Synced', groupWork: 'Group work', examPreparation: 'Exam training', logout: 'Log out',
    startSubject: 'Start subject', newSubject: 'Create subject', subject: 'Subject', subjectColor: 'Subject colour',
    subjectHint: 'The subject is added as a separate paper in the notebook and organised automatically under Notes+.',
    startNotebook: 'Start notebook', createNotebook: '+ Create new notebook', deleteNotebook: 'Delete notebook',
    notebookInstruction: 'Hover over a paper and click to open its linked subject.',
    notebookCount: 'Notebook', of: 'of', notesOne: 'note', notesMany: 'notes',
    professionalBachelor: 'Professional bachelor', phd: 'PhD',
    deleteNotebookFirst: 'Delete this notebook and all its subjects and notes?',
    deleteNotebookAgain: 'Are you completely sure? This cannot be undone.',
    projectsAndGroupWork: 'Projects & group work', comingSoonBadge: 'Coming soon',
    comingSoonMessage: 'Projects and group work are on their way and coming soon!',
  },
  sv: {
    home: 'Hem', search: 'Sökning', aiAssistant: 'Studiehjälp', flashcards: 'Flashcards', graphView: 'Grafvy',
    notes: 'ANTECKNINGAR', projects: 'PROJEKT', resources: 'RESURSER',
    addSubject: '+ Skapa ämne', addSemester: '+ Ny termin', addProject: '+ Nytt projekt',
    bachelor: 'Kandidat', master: 'Master', semester: 'Termin',
    newSemester: 'Lägg till termin', pickSemester: 'Välj kandidat (1 til 6) eller master (1 til 2)',
    noSubjects: 'Inga ämnen denna termin.', createSubject: 'Skapa ditt första ämne.',
    cancel: 'Avbryt', examPlan: '📅 Tentamenplan', emailNotes: 'Skicka anteckning', settings: 'Inställningar', guide: 'Visa introduktion',
    searchPlaceholder: 'Sök i anteckningar...', synced: 'Synkroniserad', groupWork: 'Grupparbete', examPreparation: 'Tentamensträning', logout: 'Logga ut',
    startSubject: 'Starta ämne', newSubject: 'Skapa ämne', subject: 'Ämne', subjectColor: 'Ämnesfärg',
    subjectHint: 'Ämnet läggs som ett separat papper i anteckningsboken och organiseras automatiskt under Anteckningar+.',
    startNotebook: 'Starta anteckningsbok', createNotebook: '+ Skapa ny anteckningsbok', deleteNotebook: 'Radera anteckningsbok',
    notebookInstruction: 'Håll musen över ett papper och klicka för att öppna det kopplade ämnet.',
    notebookCount: 'Anteckningsbok', of: 'av', notesOne: 'anteckning', notesMany: 'anteckningar',
    professionalBachelor: 'Yrkesbachelor', phd: 'Doktorand',
    deleteNotebookFirst: 'Radera anteckningsboken och alla dess ämnen och anteckningar?',
    deleteNotebookAgain: 'Är du helt säker? Det går inte att ångra.',
    projectsAndGroupWork: 'Projekt & grupparbete', comingSoonBadge: 'Kommer snart',
    comingSoonMessage: 'Projekt och grupparbete är på väg och kommer snart!',
  },
  no: {
    home: 'Hjem', search: 'Søk', aiAssistant: 'Studiehjelp', flashcards: 'Flashcards', graphView: 'Grafvisning',
    notes: 'NOTATER', projects: 'PROSJEKTER', resources: 'RESSURSER',
    addSubject: '+ Opprett fag', addSemester: '+ Nytt semester', addProject: '+ Nytt prosjekt',
    bachelor: 'Bachelor', master: 'Master', semester: 'Semester',
    newSemester: 'Legg til semester', pickSemester: 'Velg bachelor (1 til 6) eller master (1 til 2)',
    noSubjects: 'Ingen fag dette semesteret.', createSubject: 'Opprett ditt første fag.',
    cancel: 'Avbryt', examPlan: '📅 Eksamensplan', emailNotes: 'Send note på e-post', settings: 'Innstillinger', guide: 'Vis introduksjon',
    searchPlaceholder: 'Søk i notater...', synced: 'Synkronisert', groupWork: 'Gruppearbeid', examPreparation: 'Eksamenstrening', logout: 'Logg ut',
    startSubject: 'Start fag', newSubject: 'Opprett fag', subject: 'Fag', subjectColor: 'Fagfarge',
    subjectHint: 'Faget legges som et eget papir i notatboken og organiseres automatisk under Notater+.',
    startNotebook: 'Start notatbok', createNotebook: '+ Opprett ny notatbok', deleteNotebook: 'Slett notatbok',
    notebookInstruction: 'Hold musen over et papir og klikk for å åpne det tilknyttede faget.',
    notebookCount: 'Notatbok', of: 'av', notesOne: 'notat', notesMany: 'notater',
    professionalBachelor: 'Profesjonsbachelor', phd: 'Ph.d.',
    deleteNotebookFirst: 'Slette notatboken og alle fagene og notatene i den?',
    deleteNotebookAgain: 'Er du helt sikker? Dette kan ikke angres.',
    projectsAndGroupWork: 'Prosjekter & gruppearbeid', comingSoonBadge: 'Kommer snart',
    comingSoonMessage: 'Prosjekter og gruppearbeid er på vei og kommer snart!',
  },
  fr: {
    home: 'Accueil', search: 'Recherche', aiAssistant: 'Assistant IA', flashcards: 'Flashcards', graphView: 'Vue graphe',
    notes: 'NOTES', projects: 'PROJETS', resources: 'RESSOURCES',
    addSubject: '+ Créer matière', addSemester: '+ Nouveau semestre', addProject: '+ Nouveau projet',
    bachelor: 'Licence', master: 'Master', semester: 'Semestre',
    newSemester: 'Ajouter un semestre', pickSemester: 'Licence (1 til 6) ou Master (1 til 2)',
    noSubjects: 'Aucune matière ce semestre.', createSubject: 'Créez votre première matière.',
    cancel: 'Annuler', examPlan: '📅 Plan examen', emailNotes: 'Envoyer par email', settings: 'Paramètres', guide: 'Introduction',
    searchPlaceholder: 'Rechercher...', synced: 'Synchronisé', groupWork: 'Travail de groupe', examPreparation: "Entraînement à l'examen", logout: 'Se déconnecter',
    startSubject: 'Créer une matière', newSubject: 'Créer la matière', subject: 'Matière', subjectColor: 'Couleur de la matière',
    subjectHint: 'La matière est ajoutée comme une feuille distincte et organisée automatiquement sous Notes+.',
    startNotebook: 'Créer un carnet', createNotebook: '+ Nouveau carnet', deleteNotebook: 'Supprimer le carnet',
    notebookInstruction: 'Survolez une feuille et cliquez pour ouvrir la matière associée.',
    notebookCount: 'Carnet', of: 'sur', notesOne: 'note', notesMany: 'notes',
    professionalBachelor: 'Licence professionnelle', phd: 'Doctorat',
    deleteNotebookFirst: 'Supprimer ce carnet ainsi que toutes ses matières et notes ?',
    deleteNotebookAgain: 'Êtes-vous absolument sûr ? Cette action est irréversible.',
    projectsAndGroupWork: 'Projets & travail de groupe', comingSoonBadge: 'Bientôt disponible',
    comingSoonMessage: 'Les projets et le travail de groupe arrivent bientôt !',
  },
  es: {
    home: 'Inicio', search: 'Búsqueda', aiAssistant: 'Asistente IA', flashcards: 'Flashcards', graphView: 'Vista de grafo',
    notes: 'NOTAS', projects: 'PROYECTOS', resources: 'RECURSOS',
    addSubject: '+ Crear asignatura', addSemester: '+ Nuevo semestre', addProject: '+ Nuevo proyecto',
    bachelor: 'Grado', master: 'Máster', semester: 'Semestre',
    newSemester: 'Añadir semestre', pickSemester: 'Grado (1 til 6) o Máster (1 til 2)',
    noSubjects: 'Sin asignaturas este semestre.', createSubject: 'Crea tu primera asignatura.',
    cancel: 'Cancelar', examPlan: '📅 Plan de examen', emailNotes: 'Enviar nota', settings: 'Ajustes', guide: 'Introducción',
    searchPlaceholder: 'Buscar notas...', synced: 'Sincronizado', groupWork: 'Trabajo en grupo', examPreparation: 'Entrenamiento de examen', logout: 'Cerrar sesión',
    startSubject: 'Crear asignatura', newSubject: 'Crear asignatura', subject: 'Asignatura', subjectColor: 'Color de asignatura',
    subjectHint: 'La asignatura se añade como una hoja independiente y se organiza automáticamente en Notas+.',
    startNotebook: 'Crear cuaderno', createNotebook: '+ Nuevo cuaderno', deleteNotebook: 'Eliminar cuaderno',
    notebookInstruction: 'Pasa el cursor sobre una hoja y haz clic para abrir su asignatura.',
    notebookCount: 'Cuaderno', of: 'de', notesOne: 'nota', notesMany: 'notas',
    professionalBachelor: 'Grado profesional', phd: 'Doctorado',
    deleteNotebookFirst: '¿Eliminar este cuaderno y todas sus asignaturas y notas?',
    deleteNotebookAgain: '¿Estás completamente seguro? Esta acción no se puede deshacer.',
    projectsAndGroupWork: 'Proyectos y trabajo en grupo', comingSoonBadge: 'Próximamente',
    comingSoonMessage: '¡Los proyectos y el trabajo en grupo llegarán muy pronto!',
  },
};

const codeSnippets = {
  MATLAB: 'disp("Hello, world!")',
  Python: 'print("Hello, world!")',
  JavaScript: 'console.log("Hello, world!");',
  'C++': '#include <iostream>\nint main() {\n  std::cout << "Hello, world!";\n  return 0;\n}',
  Arduino: 'void setup() {\n  Serial.begin(9600);\n  Serial.println("Hello, world!");\n}\n\nvoid loop() {}',
  SQL: 'SELECT "Hello, world!" AS message;',
  HTML: '<section>\n  <h2>Titel</h2>\n  <p>Indhold</p>\n</section>',
  Java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, world!");\n  }\n}',
};

const capabilityGroups = [
  {
    id: 'learning', icon: '✦', title: 'Læring og AI',
    items: [
      ['PDF → Studienoter', 'pdf-notes'], ['PDF → Flashcards', 'pdf-flashcards'], ['PDF → Quizzer', 'pdf-quiz'],
      ['Find misforståelser', 'misconceptions'], ['Faglig feedback', 'feedback'],
      ['Teaching Mode', 'teaching'], ['Min eksamensparathed', 'grade'], ['Studieplan', 'study-plan'],
      ['Eksamensplan', 'exam'], ['Fokus Mode', 'focus'], ['Pomodoro', 'pomodoro'],
      ['Flashcards', 'flash'], ['Spaced Repetition', 'spaced'], ['Popup quizzer', 'quiz'],
      ['Quiz automatisk', 'quiz'],
      ['Fremskridtsoverblik', 'progress'], ['AI tutor', 'tutor'], ['Opgavegenerator', 'tasks'],
      ['Trin for trin løsninger', 'derive'], ['Opsummeringer', 'summary'], ['Forklaringer', 'explain'],
      ['AI spørgsmål til noter', 'questions'], ['"Har du forstået dette?" check', 'understood'], ['"Har du svært ved faget?" assistent', 'help'],
      ['Personligt læringsforløb', 'learning-path'], ['Studieanbefalinger', 'recommendations'], ['Karrierevejledning til STEM', 'career'],
    ],
  },
  {
    id: 'math-code', icon: '∑', title: 'Matematik og kode',
    items: [
      ['Formelbibliotek', 'formula'], ['Formelforklaringer', 'explain'], ['Formelafledninger', 'derive'],
      ['Grafplotter', 'graph'], ['Matrixberegner', 'matrix'], ['Avanceret lommeregner', 'calculator'], ['Enhedskonverter', 'convert'],
      ['CAS beregninger', 'algebra'], ['LaTeX editor', 'latex'], ['Håndskrift → Matematik', 'draw'],
      ['Håndskrift → Tekst', 'draw'], ['Kodeeditor (alle sprog)', 'code'], ['Kør kode direkte', 'run-code'],
      ['Arduino support', 'arduino'], ['ESP32 support', 'esp32'], ['ROS support', 'ros'],
      ['Kodesnippets', 'code'], ['AI kodehjælp', 'debug'],
    ],
  },
  {
    id: 'engineering', icon: '⚡', title: 'Elektronik og robotik',
    items: [
      ['Datasheets', 'datasheet'], ['Arduino biblioteker', 'arduino-library'], ['Sensorbibliotek', 'sensor-library'],
      ['Robotics Workspace', 'robot'], ['Electronics Workspace', 'circuit'], ['Mechanical Workspace', 'mechanics'],
      ['Electronics & Robotics Workspace', 'robot'],
      ['CAD Workspace', 'model'], ['Kredsløbstegner', 'circuit'], ['Breadboard editor', 'breadboard'],
      ['Kredsløbssimulering', 'circuit-sim'], ['Komponentbibliotek', 'components'], ['PCB preview', 'pcb'],
      ['Oscilloskop-visning', 'oscilloscope'], ['Signal analyse', 'signal'], ['FFT værktøjer', 'fft'],
      ['3D robot simulator', 'robot'], ['Robot arm designer', 'robot'], ['Kinematik værktøjer', 'kinematics'],
      ['Dynamik værktøjer', 'dynamics'], ['PID tuning værktøj', 'pid'], ['Free Body Diagram generator', 'mechanics'],
    ],
  },
  {
    id: 'visual-project', icon: '◎', title: '3D, diagrammer og projekt',
    items: [
      ['3D model viewer', 'model'], ['STL viewer', 'model'], ['STEP viewer', 'model'], ['OBJ viewer', 'model'],
      ['3D annotationer', 'model'], ['UML diagrammer', 'uml'], ['Flowcharts', 'flowchart'], ['Mindmaps', 'mindmap'],
      ['3D modeller + simulering direkte i noterne', 'model'],
      ['Knowledge Graph', 'knowledge'], ['Relationer mellem noter', 'relations'], ['Automatisk linking', 'links'],
      ['Smart søgning', 'search'], ['Projektdashboard', 'project-dashboard'], ['Kanban board', 'kanban'],
      ['Opgavestyring', 'task-management'], ['Mål tracking', 'goals'], ['STEM Canvas', 'model'],
      ['Laboratoriejournal', 'labReport'], ['Forskningsnoter', 'research'], ['STEM templates', 'templates'],
    ],
  },
  {
    id: 'platform', icon: '▦', title: 'Deling og platform',
    items: [
      ['Mail noter', 'mail'], ['Del noter', 'share'], ['Samarbejde i realtid', 'collaboration'],
      ['Offline mode', 'offline'], ['Cloud sync', 'cloud'], ['Mobil app', 'mobile'],
      ['Tablet optimering', 'tablet'], ['Dark mode', 'dark'], ['Widgets panel', 'widgets'],
      ['Hurtigværktøjer', 'widgets'], ['Zotero integration', 'zotero'], ['Reference manager', 'references'],
    ],
  },
];

function auditToolRegistry() {
  const packTools = Object.values(toolPacks).flatMap(pack => pack.tools.map(([key, label]) => ({ key, label })));
  const capabilityTools = capabilityGroups.flatMap(group => group.items.map(([label, action]) => ({ action, label, group: group.id })));
  const invalidPackTools = packTools.filter(item => !item.key || !item.label);
  const invalidCapabilities = capabilityTools.filter(item => !item.action || !item.label);
  const uniquePackTools = new Set(packTools.map(item => item.key));
  const uniqueCapabilities = new Set(capabilityTools.map(item => item.action));
  return {
    ok: invalidPackTools.length === 0 && invalidCapabilities.length === 0,
    packButtons: packTools.length,
    uniquePackTools: uniquePackTools.size,
    capabilityButtons: capabilityTools.length,
    uniqueCapabilities: uniqueCapabilities.size,
    invalidPackTools,
    invalidCapabilities,
  };
}

function L(lang, key) {
  const dict = stemI18n[lang] || stemI18n.da;
  return key.split('.').reduce((o, k) => o?.[k], dict) ?? key;
}

function uiLang() {
  return appSettings.interfaceLanguage || 'da';
}

function U(key) {
  return uiI18n[uiLang()]?.[key] ?? uiI18n.da[key] ?? key;
}

function formatSemesterLabel(sem, lang) {
  const year = sem.year || 1;
  return `${U('semester')} ${year}`;
}

function formatSemesterOption(sem) {
  if (sem.program === 'free') return 'Fri note';
  if (sem.program === 'gymnasium') return `Gymnasium: ${sem.year}. år`;
  const program = sem.program === 'master' ? U('master')
    : sem.program === 'professional' ? U('professionalBachelor')
      : sem.program === 'phd' ? U('phd') : U('bachelor');
  return `${program}: ${formatSemesterLabel(sem)}`;
}

function semesterSortKey(sem) {
  const p = sem.program === 'free' ? -20 : sem.program === 'gymnasium' ? -10
    : sem.program === 'professional' ? 5 : sem.program === 'master' ? 10 : sem.program === 'phd' ? 20 : 0;
  return p + (sem.year || 1);
}

function applyUiLanguage() {
  const lang = uiLang();
  document.querySelectorAll('[data-ui]').forEach(el => {
    const text = U(el.dataset.ui);
    if (text) el.textContent = text;
  });
  const search = $('#globalSearch');
  if (search) search.placeholder = U('searchPlaceholder');
  document.documentElement.lang = lang;
  if ($('#pageSetupDialog')?.open) {
    const selected = document.querySelector('#docTypeGrid input[name="docType"]:checked')?.value || 'other';
    renderDocTypePicker(normalizeDocTypePickerValue(selected));
  }
}

function migrateSemester(sem) {
  if (sem.program && sem.year !== undefined) {
    if (!sem.name) sem.name = formatSemesterOption(sem);
    if (!sem.color) sem.color = '#34312e';
    return sem;
  }
  const name = (sem.name || '').toLowerCase();
  const num = Number((sem.name || '').match(/\d+/)?.[0]) || 1;
  sem.program = /master|kandidat|máster|máster|magister/i.test(name) ? 'master' : 'bachelor';
  sem.year = sem.program === 'master' ? Math.min(2, num) : Math.min(6, Math.max(1, num));
  sem.name = sem.name || formatSemesterOption(sem);
  sem.color = sem.color || '#34312e';
  return sem;
}

function tb(lang, toolKey) {
  return `<button type="button" class="tool" data-tool="${toolKey}">${escapeHtml(L(lang, 'tools.' + toolKey))}</button>`;
}

function tbCode(lang, codeLang, labelKey) {
  const label = labelKey === 'code' ? (lang === 'da' ? 'Kodeeditor' : 'Code editor') : L(lang, 'tools.' + labelKey);
  return `<button type="button" class="tool" data-open-code data-code-lang="${escapeHtml(codeLang)}">${escapeHtml(label)}</button>`;
}

function tbCmd(lang, toolKey, cmd, val) {
  const valAttr = val ? ` data-value="${val}"` : '';
  return `<button type="button" class="tool" data-command="${cmd}"${valAttr}>${escapeHtml(L(lang, 'tools.' + toolKey))}</button>`;
}

function stemRow(lang, subject, css, inner) {
  return `<div class="toolbar-row toolbar-stem ${css}"><span class="row-label">${escapeHtml(L(lang, 'subjects.' + subject))}:</span>${inner}</div>`;
}

function resolvePageToolPacks(page) {
  const docType = page?.docType || 'general';
  const byDoc = {
    mathematics: ['stem', 'coding'],
    physics: ['stem', 'coding'],
    chemistry: ['stem', 'coding'],
    biology: ['stem', 'health', 'coding'],
    biotechnology: ['stem', 'health', 'coding'],
    medicine: ['health', 'stem', 'coding'],
    engineering: ['stem', 'coding'],
    civilEngineering: ['stem', 'coding'],
    electricalEngineering: ['stem', 'coding'],
    mechanicalEngineering: ['stem', 'coding'],
    softwareEngineering: ['coding', 'stem'],
    tech: ['coding', 'stem'],
    psychology: ['psychology', 'stem', 'coding'],
    health: ['health', 'stem', 'coding'],
    statistics: ['stem', 'coding'],
    general: ['general', 'coding'],
    other: ['general', 'coding'],
  };
  const defaults = (byDoc[docType] || ['general']).filter(id => toolPacks[id]);
  const custom = Array.isArray(page?.toolPacks) ? page.toolPacks.filter(id => toolPacks[id]) : [];
  if (!byDoc[docType]) return custom.length ? custom : defaults;
  const extra = custom.filter(id => !defaults.includes(id));
  const cleanedExtra = defaults.includes('general') ? extra : extra.filter(id => id !== 'general');
  return [...new Set([...defaults, ...cleanedExtra])];
}

function stemGroupsForPage(page) {
  const docType = page?.docType || 'general';
  return (toolPacks.stem.groups || []).filter(group => !group.docTypes || group.docTypes.includes(docType));
}

function packGroupsForPage(packId, page) {
  const pack = toolPacks[packId];
  if (!pack) return [];
  if (packId === 'stem' && pack.groups?.length) return stemGroupsForPage(page);
  if (pack.groups?.length) return pack.groups;
  return [{ label: pack.label, tools: pack.tools }];
}

const STEM_GROUP_TOOL_FILTERS = {
  mathematics: {
    figures: ['geometryFig', 'functionFig', 'probabilityFig', 'vennFig'],
    models: ['model', 'algorithmFig', 'dataStructFig', 'networkFig'],
  },
  statistics: {
    figures: ['functionFig', 'probabilityFig', 'vennFig'],
    models: ['model'],
  },
  physics: {
    figures: ['circuitFig', 'mechanicsFig', 'waveFig', 'geometryFig', 'functionFig'],
    models: ['model', 'circuitFig', 'mechanicsFig'],
  },
  chemistry: {
    figures: ['moleculeFig', 'cellFig', 'geometryFig'],
    models: ['model', 'moleculeFig'],
  },
};

function filterStemGroupTools(group, page) {
  const docType = page?.docType || 'general';
  const filters = STEM_GROUP_TOOL_FILTERS[docType];
  let tools = group.tools || [];
  if (pageHasFormulaTools(page) && group.id === 'graphs') {
    tools = tools.filter(([tool]) => tool !== 'formula');
  }
  if (filters?.[group.id]) {
    const allowed = new Set(filters[group.id]);
    tools = tools.filter(([tool]) => allowed.has(tool));
  }
  return tools;
}

function renderStemPackRows(lang, page) {
  return stemGroupsForPage(page).flatMap(group => {
    const tools = filterStemGroupTools(group, page);
    if (!tools.length) return [];
    return `<div class="toolbar-row toolbar-stem pack-stem group-${group.id || 'misc'}"><span class="row-label">${escapeHtml(group.label)}:</span>${tools.map(([tool, label]) => packToolHtml(tool, label, lang)).join('')}</div>`;
  }).join('');
}

function renderPackRows(lang, page) {
  return resolvePageToolPacks(page).flatMap(packId => {
    if (packId === 'stem') return [renderStemPackRows(lang, page)];
    const pack = toolPacks[packId];
    return packGroupsForPage(packId, page).map(group => {
      const rowLabel = group.label === pack.label ? `${pack.icon ? `${pack.icon} ` : ''}${pack.label}` : group.label;
      return `<div class="toolbar-row toolbar-stem pack-${packId}"><span class="row-label">${escapeHtml(rowLabel)}:</span>${group.tools.map(([tool, label]) => packToolHtml(tool, label, lang)).join('')}</div>`;
    });
  }).join('');
}

const CODE_EDITOR_TOOL_ALIASES = new Set(['code', 'arduino', 'ros', 'libraries', 'debug', 'run-code', 'python', 'javascript', 'java', 'cpp', 'go', 'rust', 'sql', 'web', 'matlab']);

function packToolHtml(tool, label, lang) {
  if (CODE_EDITOR_TOOL_ALIASES.has(tool)) {
    return '';
  }
  const musicNative = ['notation', 'chords', 'rhythm', 'earTraining'];
  const modelNative = Object.keys(figureToolTemplates);
  if (tool === 'quote') return tbCmd(lang, 'quote', 'formatBlock', 'blockquote');
  if (musicNative.includes(tool)) return `<button type="button" class="tool interactive-tool" data-tool="${tool}">${escapeHtml(label)}</button>`;
  if (modelNative.includes(tool)) return `<button type="button" class="tool interactive-tool" data-tool="${tool}">${escapeHtml(label)}</button>`;
  if (['calculator', 'formula', 'matrix', 'graph', 'model', 'labReport', 'statistics', 'table', 'algebra', 'latex', 'siUnits', 'convert', 'draw', 'circuit'].includes(tool)) return `<button type="button" class="tool interactive-tool" data-tool="${tool}">${escapeHtml(label)}</button>`;
  return `<button type="button" class="tool interactive-tool" data-university-tool="${tool}">${escapeHtml(label)}</button>`;
}

function renderToolbarExtra(lang, page) {
  const showDocFormat = ['general', 'other', 'tech', 'engineering'].includes(page?.docType || 'general');
  return `<div class="toolbar-extra">
    ${renderFormulaQuickRow(page)}
    ${renderPackRows(lang, page)}
    ${showDocFormat ? stemRow(lang, 'document', 'cat-doc',
      tbCmd(lang, 'heading', 'formatBlock', 'h2') + tbCmd(lang, 'bulletList', 'insertUnorderedList') +
      tbCmd(lang, 'orderedList', 'insertOrderedList') + tbCmd(lang, 'quote', 'formatBlock', 'blockquote') +
      tb(lang, 'table') + tb(lang, 'checklist') + tb(lang, 'hr') + tb(lang, 'draw')) : ''}
    ${showDocFormat ? stemRow(lang, 'format', 'cat-fmt',
      `<input class="color-tool" id="textColor" type="color" value="#1a1a2e" title="Text">
      <input class="color-tool" id="highlightColor" type="color" value="#bfdbfe" title="Highlight">
      <button type="button" class="tool" data-command="strikeThrough"><s>S</s></button>
      <button type="button" class="tool" data-command="superscript">x²</button>
      <button type="button" class="tool" data-command="subscript">x₂</button>
      <button type="button" class="tool" data-command="removeFormat">${escapeHtml(L(lang, 'tools.removeFormat'))}</button>`) : ''}
  </div>`;
}

function findToolLabel(tool, page, lang) {
  for (const packId of resolvePageToolPacks(page || {})) {
    const pack = toolPacks[packId];
    const sources = [pack?.tools || [], ...(pack?.groups || []).flatMap(g => g.tools || [])];
    for (const source of sources) {
      const hit = source.find(([id]) => id === tool);
      if (hit) return hit[1];
    }
  }
  const translated = L(lang, 'tools.' + tool);
  return translated !== 'tools.' + tool ? translated : tool;
}

function renderContextTools(lang, page) {
  if (page?.docType === 'mathematics' && page?.toolPacks?.includes('stem')) return '';
  const cfg = docTypes[page?.docType] || docTypes.general;
  const mathLabels = {
    algebra: 'Algebra', calculus: 'Calculus', linearAlgebra: 'Lineær algebra', differentialEquations: 'Differentialligninger',
    analysis: 'Analyse', complexAnalysis: 'Kompleks analyse', probability: 'Sandsynlighed', statistics: 'Statistik',
    numericalMethods: 'Numerik', optimization: 'Optimering', geometry: 'Geometri', topology: 'Topologi',
    discreteMath: 'Diskret matematik', numberTheory: 'Talteori', logic: 'Logik', matrix: 'Matrix', calculator: 'Avanceret lommeregner', graph: 'Plotter', latex: 'LaTeX'
  };
  let toolHtml = cfg.tools.slice(0, page?.docType === 'mathematics' ? 10 : cfg.tools.length).map(key => {
    if (key === 'code') return tbCode(lang, 'Python', 'code');
    if (key === 'latex') return `<button type="button" class="tool" id="openMath">${escapeHtml(L(lang, 'latex'))}</button>`;
    if (key === 'heading') return tbCmd(lang, 'heading', 'formatBlock', 'h2');
    if (key === 'bulletList') return tbCmd(lang, 'bulletList', 'insertUnorderedList');
    if (key === 'quote') return tbCmd(lang, 'quote', 'formatBlock', 'blockquote');
    if (page?.docType === 'mathematics') return packToolHtml(key, mathLabels[key] || key, lang);
    return packToolHtml(key, findToolLabel(key, page, lang), lang);
  }).join('');
  if (!toolHtml) {
    const primaryPack = toolPacks[page?.toolPacks?.[0] || studyFieldPack(appSettings.studyField) || 'general'];
    toolHtml = primaryPack?.tools.slice(0, 8).map(([tool, label]) => packToolHtml(tool, label, lang)).join('') || '';
  }
  if (!toolHtml) return '';
  const recent = (appSettings.recentTools || [])
    .filter(item => !CODE_EDITOR_TOOL_ALIASES.has(item.id))
    .slice(0, 4);
  const recommended = getRecommendedTools(page);
  const recentHtml = recent.length ? `<div class="context-tools-section"><span class="context-tools-label">Senest brugt</span>${recent.map(item => `<button type="button" class="tool interactive-tool" data-recent-tool="${item.id}">${escapeHtml(item.label)}</button>`).join('')}</div>` : '';
  const recHtml = recommended.length ? `<div class="context-tools-section"><span class="context-tools-label">Anbefalet til ${escapeHtml(pageDocTypeLabel(page))}</span>${recommended.map(item => packToolHtml(item.id, item.label, lang)).join('')}</div>` : '';
  const factBtn = `<button type="button" class="tool tool-fact" id="runFactCheck" title="Fagligt forståelsestjek — ikke stavekontrol">Tjek forståelse</button>`;
  return `<div class="toolbar-row toolbar-context cat-${page?.docType || 'general'}">
    <span class="row-label">${cfg.icon ? `${cfg.icon} ` : ''}${escapeHtml(pageDocTypeLabel(page))}:</span>
    <div class="context-tools-dropdown">
      <button type="button" class="tool context-tools-toggle" id="toggleContextTools" aria-expanded="false" aria-controls="contextToolsMenu">Værktøjer ▾</button>
      <div class="context-tools-menu" id="contextToolsMenu" hidden>${recHtml}${recentHtml}<div class="context-tools-section"><span class="context-tools-label">Alle værktøjer</span>${toolHtml}</div></div>
    </div>
    ${factBtn}
  </div>`;
}

function renderPaperModePicker(page) {
  const v = page?.pageView || 'continuous';
  return `<div class="paper-mode-picker" role="group" aria-label="Papirvisning">
    <button type="button" class="paper-mode-card ${v === 'continuous' ? 'active' : ''}" data-page-view="continuous" title="Sider under hinanden – som i Word">
      <span class="paper-mode-art mode-art-split" aria-hidden="true"></span>
      <span class="paper-mode-label">Opdelt</span>
    </button>
    <button type="button" class="paper-mode-card ${v === 'stack' ? 'active' : ''}" data-page-view="stack" title="Sider lagt oven i hinanden som en stak">
      <span class="paper-mode-art mode-art-stack" aria-hidden="true"></span>
      <span class="paper-mode-label">Stak</span>
    </button>
    <button type="button" class="paper-mode-card ${v === 'book' ? 'active' : ''}" data-page-view="book" title="Spiralnotesbog på skrivebord – blad som en rigtig bog">
      <span class="paper-mode-art mode-art-book" aria-hidden="true"></span>
      <span class="paper-mode-label">Spiralbog</span>
    </button>
    <button type="button" class="paper-mode-card ${v === 'infinite' ? 'active' : ''}" data-page-view="infinite" title="Ét langt ark – skriv videre uden sideskift">
      <span class="paper-mode-art mode-art-long" aria-hidden="true"></span>
      <span class="paper-mode-label">Langt ark</span>
    </button>
  </div>`;
}

function renderPaperControls(page) {
  const pattern = page?.paperPattern || 'dots';
  const patterns = [
    ['clear', 'Blankt'],
    ['dots', 'Prikker'],
    ['lined', 'Linjer'],
    ['grid', 'Grid'],
    ['cornell', 'Cornell'],
  ];
  const linesActive = page?.bookLines !== false;
  return `<div class="paper-control-strip" aria-label="Papir">
    <span>Papir</span>
    ${patterns.map(([id, label]) => `<button type="button" class="${pattern === id ? 'active' : ''}" data-paper-pattern="${id}">${label}</button>`).join('')}
    ${renderPaperModePicker(page)}
    <button type="button" class="${linesActive ? 'active' : ''}" data-book-lines>${linesActive ? 'Linjer til' : 'Linjer fra'}</button>
    <button type="button" data-paper-corners>${page?.paperCorners === 'square' ? 'Firkant' : 'Rundt'}</button>
    <button type="button" data-paper-zoom="-10">−</button>
    <small>${Number(page?.paperZoom || 100)}%</small>
    <button type="button" data-paper-zoom="10">+</button>
  </div>`;
}

function renderToolbarHtml(lang, tbExpanded, page) {
  const annotationMode = page?.viewMode === 'annotate';
  const sheetCount = Math.max(1, page?.sheets?.length || 1);
  const currentSheet = Number(page?.currentSheet || 0);
  return `
    <div class="note-chip-toolbar" aria-label="Noteværktøjer">
      <button type="button" class="tool" id="insertFormula"><span>∑</span>Formler</button>
      <button type="button" class="tool" data-code-template="Python"><span>&lt;/&gt;</span>Kodeeksempel</button>
      <button type="button" class="tool" data-university-tool="robotics"><span>⌘</span>Robotik & systemer</button>
      <button type="button" class="tool" id="openToolPacks"><span>▣</span>Fejlfinding & pakker</button>
      <button type="button" class="tool" data-tool="algebra"><span>ƒ</span>Algebra & analyse</button>
      <button type="button" class="tool" data-tool="linearAlgebra"><span>↔</span>Lineær algebra & diskret</button>
      <button type="button" class="tool" data-command="formatBlock" data-value="h2"><span>▤</span>Dokument</button>
      <button type="button" class="tool" data-command="removeFormat"><span>⌁</span>Format</button>
      <button type="button" class="tool add-chip" id="openToolPacksMore"><span>＋</span>Indsæt værktøj</button>
    </div>
    ${renderPaperControls(page)}`;
  return `
    <div class="toolbar-row toolbar-basic">
      <button type="button" class="tool tool-icon" data-command="formatBlock" data-value="p" title="Normal tekst">¶</button>
      <button type="button" class="tool" data-command="formatBlock" data-value="h1">H1</button>
      <button type="button" class="tool" data-command="formatBlock" data-value="h2">H2</button>
      <button type="button" class="tool" data-command="formatBlock" data-value="h3">H3</button>
      <button type="button" class="tool" data-command="bold"><b>B</b></button>
      <button type="button" class="tool" data-command="italic"><i>I</i></button>
      <button type="button" class="tool" data-command="underline"><u>U</u></button>
      <select class="font-size-tool" id="fontSize" title="Skriftstørrelse" aria-label="Skriftstørrelse">
        <option value="12">12</option><option value="14">14</option><option value="16" selected>16</option><option value="18">18</option><option value="20">20</option><option value="24">24</option><option value="28">28</option><option value="32">32</option><option value="40">40</option><option value="48">48</option>
      </select>
      <span class="divider"></span>
      <button type="button" class="tool tool-icon" id="insertFormula" title="${escapeHtml(L(lang, 'formula'))}">∑</button>
      <button type="button" class="tool tool-icon" id="openMath" title="${escapeHtml(L(lang, 'latex'))}">∫</button>
      <button type="button" class="tool tool-icon" id="openCalculator" title="Avanceret lommeregner">fx</button>
      <button type="button" class="tool" id="startDictation" title="Stemme til noter">Stemme</button>
      <button type="button" class="tool tool-icon" data-command="insertUnorderedList" title="Liste">☷</button>
      <button type="button" class="tool tool-icon" data-command="insertOrderedList" title="Nummereret liste">≡</button>
      <div class="study-help-dropdown">
        <button type="button" class="tool study-help-toggle" id="toggleStudyHelp" aria-expanded="false" aria-controls="studyHelpMenu" title="Samlet studiehjælp">✦ Studiehjælp ▾</button>
        <div class="study-help-menu" id="studyHelpMenu" hidden>
          <button type="button" data-study-help="explain">Forklar tekst</button>
          <button type="button" data-study-help="summarize">Lav overblik</button>
          <button type="button" data-study-help="questions">Eksamensspørgsmål</button>
          <button type="button" data-study-help="understood">Tjek forståelse</button>
          <button type="button" data-study-help="proofread">Omskriv tekst (AI)</button>
        </div>
      </div>
      <button type="button" class="tool remember-tool" id="insertImportant">Vigtigt at huske</button>
      <button type="button" class="tool exam-mode-tool" id="startNoteExamMode" title="Træn på denne ene note — Testcenter dækker hele pensum">Eksamensmode (note)</button>
      <label class="note-search-box" title="Søg i denne note"><span>⌕</span><input id="noteSearch" type="search" placeholder="Søg i note"></label>
      <button type="button" class="tool proofreading-toggle ${page?.proofreading === false ? '' : 'active'}" id="toggleProofreading" title="Kun stavefejl og tegnsætning — ikke faglig omskrivning">
        <span>✓</span>Stavekontrol
      </button>
      <button type="button" class="tool" id="openToolPacks">+ Værktøjer</button>
      ${pageHasFormulaTools(page) ? '' : (page?.toolPacks?.includes('stem') ? `<button type="button" class="tool formula-library-tool" id="openFormulaLibrary" title="Åbn formelbiblioteket med alle formler">∑ Formelbibliotek</button>` : '')}
      <button type="button" class="tool toggle-tools" id="toggleToolbar">Alle værktøjer ${tbExpanded ? '▴' : '▾'}</button>
    </div>
    <div class="toolbar-row editor-mode-row">
      <div class="paper-nav-group">
        <button type="button" class="page-nav-button" data-sheet-direction="-1" ${currentSheet === 0 || page?.pageView === 'infinite' || page?.pageView === 'continuous' ? 'disabled' : ''}>← Forrige</button>
        <span class="page-counter">${page?.pageView === 'infinite' ? 'Langt ark' : page?.pageView === 'continuous' ? `Alle ${sheetCount} sider` : page?.pageView === 'book' ? `Spiralbog · Side ${currentSheet + 1} af ${sheetCount}` : `Side ${currentSheet + 1} af ${sheetCount}`}</span>
        <button type="button" class="page-nav-button" data-sheet-direction="1" ${currentSheet >= sheetCount - 1 || page?.pageView === 'infinite' || page?.pageView === 'continuous' ? 'disabled' : ''}>Næste →</button>
      </div>
      ${renderPaperModePicker(page)}
      <div class="paper-extra-controls">
        ${page?.pageView === 'book' ? `<button type="button" class="page-view-button book-lines-button ${page.bookLines !== false ? 'active' : ''}" data-book-lines title="Skriv på linjerne – klik for at slå linjer fra"><span class="paper-mode-art mode-art-lines ${page.bookLines !== false ? '' : 'off'}" aria-hidden="true"></span>${page.bookLines !== false ? 'Linjer' : 'Uden linjer'}</button>` : ''}
        <button type="button" class="page-view-button corner-button" data-paper-corners title="Skift mellem runde og firkantede papirhjørner"><span class="${page?.paperCorners === 'square' ? 'square' : ''}"></span>${page?.paperCorners === 'square' ? 'Firkant' : 'Rundt'}</button>
        <div class="paper-zoom-control" title="Zoom notepapiret">
          <button type="button" data-paper-zoom="-10" aria-label="Zoom ud">−</button>
          <span>${Number(page?.paperZoom || 100)}%</span>
          <button type="button" data-paper-zoom="10" aria-label="Zoom ind">+</button>
        </div>
      </div>
    </div>
    ${page ? renderContextTools(lang, page) : ''}
    ${renderToolbarExtra(lang, page)}`;
}

function renderPencilCase(page) {
  const colors = ['#f8d878', '#f5a7b8', '#a9d8ca', '#a9c9ef', '#c8b4e8'];
  return `<aside class="pencil-pouch ${activeWritingTool.type !== 'pointer' ? 'tool-active' : ''}" aria-label="Interaktivt penalhus">
    <div class="pouch-tools">
      <button type="button" class="pouch-tool mouse-tool ${activeWritingTool.type === 'pointer' ? 'selected' : ''}" data-writing-pointer title="Normal mus"><span><i></i></span></button>
      <button type="button" class="pouch-tool pen-tool ${activeWritingTool.type === 'pen' ? 'selected extracted' : ''}" data-annotation-tool="pen" title="Apple Pencil / pen"><span></span></button>
      ${colors.map((color, i) => `<button type="button" class="pouch-tool highlighter-tool ${activeWritingTool.type === 'marker' && activeWritingTool.color === color ? 'selected extracted' : ''}" data-marker-color="${color}" style="--marker:${color}" title="Overstregning ${i + 1}"><span></span></button>`).join('')}
      <button type="button" class="pouch-tool eraser-tool ${activeWritingTool.type === 'eraser' ? 'selected extracted' : ''}" data-annotation-tool="eraser" title="Viskelæder"><span></span></button>
    </div>
    <div class="pouch-back"><span class="pouch-seam"></span></div>
    <div class="pouch-front"><span class="pouch-shine"></span><b>Note'it</b></div>
  </aside>`;
}

const layoutTemplates = {
  classic: { name: 'Almindeligt', detail: 'Helt hvidt papir uden fast opstilling' },
  outline: { name: 'Overskrift og stikord', detail: 'Gentag overskrift efterfulgt af korte stikord', starter: '<section class="outline-section"><h2>Overskrift</h2><ul><li>Stikord</li><li>Stikord</li></ul></section><section class="outline-section"><h2>Næste overskrift</h2><ul><li>Stikord</li></ul></section>' },
  lined: { name: 'Linjeret', detail: 'Diskrete vandrette linjer', starter: '<h1>Forelæsningsnoter</h1><p>Dato og emne</p><h2>Vigtige pointer</h2><p>Begynd her...</p>' },
  grid: { name: 'Kvadreret', detail: 'Til matematik, diagrammer og skitser', starter: '<h1>Problem</h1><h2>Givet</h2><p>Variabler og formler</p><h2>Løsning</h2><p>Udregning...</p>' },
  ringCornell: { name: 'Cornell notesbog', detail: 'Ringbind med stikord, hovednoter og resumé', starter: '<h1>Emne og dato</h1><h2>Hovednoter</h2><p>Skriv dine noter her...</p><h2>Nøglepointer</h2><p>...</p><h2>Resumé</h2><p>Opsummer siden med egne ord.</p>' },
  cornell: { name: 'Cornell', detail: 'Stikord, hovednoter og opsummering', starter: '<h1>Emne</h1><h2>Hovednoter</h2><p>Skriv forklaringen her...</p><h2>Opsummering</h2><p>Tre vigtigste pointer</p>' },
  split: { name: 'Delt side', detail: 'To kolonner til teori og eksempler', starter: '<h1>Teori og anvendelse</h1><h2>Teori</h2><p>Definition...</p><h2>Eksempel</h2><p>Anvendelse...</p>' },
  focus: { name: 'Fokus', detail: 'Smal læsekolonne med ro omkring teksten', starter: '<h1 style="text-align:center">Dagens emne</h1><p style="text-align:center">Kort introduktion</p><h2>Hovedidé</h2><p>Forklaring...</p>' },
  cream: { name: 'Varm creme', detail: 'Blød papirfarve med mindre kontrast' },
  blue: { name: 'Blå studie', detail: 'Lys blå akademisk papirflade' },
  rose: { name: 'Støvet rosa', detail: 'Rolig, varm noteflade' },
  lecture: { name: 'Forelæsning', detail: 'Tydelige sektioner til begreber, eksempler og spørgsmål', starter: '<h1>Forelæsningens titel</h1><h2>Nøglebegreber</h2><p>• Begreb og definition</p><h2>Eksempel</h2><p>...</p><h2>Spørgsmål til senere</h2><p>...</p>' },
  laboratory: { name: 'Laboratorie', detail: 'Felter til hypotese, metode, data og konklusion', starter: '<h1>Forsøg</h1><h2>Hypotese</h2><p>...</p><h2>Metode</h2><p>...</p><h2>Data</h2><p>...</p><h2>Konklusion</h2><p>...</p>' },
  mint: { name: 'Blød mint', detail: 'Rolig grøn papirfarve til lange læseperioder' },
};

function openLayoutDialog() {
  let dialog = $('#layoutDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'layoutDialog';
    dialog.className = 'layout-dialog';
    dialog.innerHTML = `<div class="modal"><div class="modal-head"><div><span class="engineering-tag">SIDEOPSÆTNING</span><h2>Vælg layout</h2><p class="modal-subtitle">Vælg en opstilling og papirstørrelse, der passer til dit fag.</p></div><button class="modal-close" data-layout-close>×</button></div>
      <div class="layout-controls">
        <div><b>Anbefalet til dit fag</b><span id="layoutRecommendation"></span></div>
        <label>Papirstørrelse<select id="paperSizeSelect"><option value="responsive">Tilpas skærmen</option><option value="a4">A4</option><option value="a5">A5</option><option value="letter">US Letter</option><option value="wide">Bred canvas</option></select></label>
        <label>Punkttegn<select id="listMarkerSelect"><option value="bullet">• Punkt</option><option value="dash">- Streg</option><option value="star">* Stjerne</option></select></label>
      </div>
      <div class="layout-gallery" id="layoutGallery"></div></div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-layout-close]')) return dialog.close();
      const choice = event.target.closest('[data-note-layout]');
      if (!choice || !activePage()) return;
      activePage().layout = choice.dataset.noteLayout;
      if (!($('#editor')?.innerText || activePage().html || '').trim() && layoutTemplates[choice.dataset.noteLayout]?.starter) {
        activePage().sheets = [layoutTemplates[choice.dataset.noteLayout].starter];
        activePage().currentSheet = 0;
        activePage().html = activePage().sheets[0];
      }
      persist();
      dialog.close();
      renderWorkspace();
    });
    dialog.addEventListener('change', event => {
      if (!activePage()) return;
      if (event.target.id === 'paperSizeSelect') activePage().paperSize = event.target.value;
      else if (event.target.id === 'listMarkerSelect') activePage().listMarker = event.target.value;
      else return;
      persist();
      renderWorkspace();
    });
  }
  const selected = activePage()?.layout || 'classic';
  const type = activePage()?.docType || 'general';
  const recommendations = {
    mathematics: ['grid','ringCornell','split'], physics: ['grid','laboratory','split'], chemistry: ['laboratory','grid','lined'],
    engineering: ['grid','laboratory','split'], tech: ['split','grid','focus'], biology: ['laboratory','cornell','lined'],
    psychology: ['cornell','focus','laboratory'], general: ['classic','lined','cornell'],
  };
  const recommended = recommendations[type] || recommendations.general;
  $('#layoutRecommendation').innerHTML = recommended.map(id => `<button type="button" data-note-layout="${id}">${escapeHtml(layoutTemplates[id].name)}</button>`).join('');
  $('#paperSizeSelect').value = activePage()?.paperSize || 'responsive';
  $('#listMarkerSelect').value = activePage()?.listMarker || 'bullet';
  $('#layoutGallery').innerHTML = Object.entries(layoutTemplates).map(([id, layout]) => `<button type="button" class="layout-choice ${id === selected ? 'active' : ''} ${recommended.includes(id) ? 'recommended' : ''}" data-note-layout="${id}"><span class="layout-preview layout-${id}"><i></i><i></i><i></i><i></i></span><b>${layout.name}</b><small>${layout.detail}</small></button>`).join('');
  dialog.showModal();
}

function openShortcutGuide() {
  let dialog = $('#shortcutDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'shortcutDialog';
    dialog.className = 'shortcut-dialog';
    const shortcuts = [
      ['⌘Z', 'Fortryd'], ['⌘⇧Z / ⌘Y', 'Gentag'], ['⌘B', 'Fed'], ['⌘I', 'Kursiv'],
      ['⌘U', 'Understreget'], ['⌘K', 'Indsæt link'], ['⌘E', 'Centerjustér'], ['⌘L', 'Venstrejustér'],
      ['⌘R', 'Højrejustér'], ['⌘S', 'Gem nu'], ['⌘A / ⌘C / ⌘V / ⌘X', 'Marker, kopiér, indsæt og klip som normalt'],
    ];
    dialog.innerHTML = `<div class="modal"><div class="modal-head"><div><span class="engineering-tag">EDITOR</span><h2>Shortcuts guide</h2><p class="modal-subtitle">Genvejene virker direkte, mens du skriver.</p></div><button class="modal-close" data-shortcut-close>×</button></div><div class="shortcut-table">${shortcuts.map(([key, action]) => `<div><kbd>${key}</kbd><span>${action}</span></div>`).join('')}</div></div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', e => { if (e.target.closest('[data-shortcut-close]')) dialog.close(); });
  }
  dialog.showModal();
}

function openStickyPicker() {
  if (!activePage()) return alert('Åbn en note først.');
  if (!requireLogin('Stickers kan prøves efter login. Opret en profil for at gemme dem i dine noter.')) return;
  captureEditorRange();
  selectedStickyColor = '#f4dfa2';
  const stickyPalette = ['#f4dfa2', '#e8c5cb', '#bad6d0', '#bfd3e2', '#d4c5e5', '#e8d2b8'];
  $('#stickyColors').innerHTML = stickyPalette.map(color => `<button type="button" class="sticky-color-choice ${color === selectedStickyColor ? 'selected' : ''}" data-sticky-color="${color}" style="background:${color}" aria-label="Vælg sticky note-farve"></button>`).join('');
  $('#stickyDialog').showModal();
}

function codeLanguageOptions() {
  return [...($('#language')?.options || [])].map(option => option.value || option.text).filter(Boolean);
}

function renderCodeLanguageStrip() {
  const strip = $('#codeLanguageStrip');
  const sel = $('#language');
  if (!strip || !sel) return;
  const active = sel.value;
  strip.innerHTML = codeLanguageOptions().map(language =>
    `<button type="button" class="${language === active ? 'active' : ''}" data-code-language-choice="${escapeHtml(language)}">${escapeHtml(language)}</button>`
  ).join('');
}

function setCodeDialogLanguage(language) {
  const sel = $('#language');
  if (!sel) return;
  const langs = codeLanguageOptions();
  sel.value = langs.includes(language) ? language : 'Python';
  renderCodeLanguageStrip();
}

function openCodeDialog(codeLang = 'Python') {
  captureEditorRange();
  setCodeDialogLanguage(codeLang);
  $('#codeInput').value = codeSnippets[codeLang] || '';
  $('#codeLibraries').value = '';
  $('#aiResult').className = 'ai-result';
  $('#aiResult').innerHTML = '';
  $('#codeDialog').showModal();
}

let advancedCalculatorLastAnswer = 0;

function normalizeCalculatorExpression(raw = '') {
  return String(raw)
    .replace(/π/g, 'pi')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/√/g, 'sqrt')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\s+/g, '');
}

function calculatorFactorial(value) {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error('Fakultet kræver et helt tal mellem 0 og 170.');
  }
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

function calculatorRawTokens(source) {
  const tokens = source.match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-zA-Z_]\w*|[()+\-*/^!,%]/g) || [];
  if (tokens.join('') !== source) throw new Error('Udtrykket indeholder tegn, lommeregneren ikke understøtter.');
  return tokens;
}

function calculatorTokensWithImplicitMultiplication(tokens, functions) {
  const result = [];
  const endsValue = token => /\d/.test(token[0]) || token === ')' || token === '!' || token === '%' || /^[a-zA-Z_]\w*$/.test(token);
  const startsValue = token => /\d/.test(token[0]) || token === '(' || /^[a-zA-Z_]\w*$/.test(token);
  tokens.forEach((token, index) => {
    const previous = tokens[index - 1];
    if (previous && endsValue(previous) && startsValue(token) && !['+', '-', '*', '/', '^', ',', '('].includes(previous)) {
      const previousIsFunction = /^[a-zA-Z_]\w*$/.test(previous) && functions[previous] && token === '(';
      if (!previousIsFunction && token !== ',' && token !== ')') result.push('*');
    }
    result.push(token);
  });
  return result;
}

function evaluateCalculatorExpression(raw, options = {}) {
  const source = normalizeCalculatorExpression(raw);
  if (!source) throw new Error('Skriv et udtryk først.');
  const angleMode = options.angleMode || 'rad';
  const toRad = value => angleMode === 'deg' ? value * Math.PI / 180 : value;
  const fromRad = value => angleMode === 'deg' ? value * 180 / Math.PI : value;
  const functions = {
    sin: value => Math.sin(toRad(value)),
    cos: value => Math.cos(toRad(value)),
    tan: value => Math.tan(toRad(value)),
    asin: value => fromRad(Math.asin(value)),
    acos: value => fromRad(Math.acos(value)),
    atan: value => fromRad(Math.atan(value)),
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log10,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    min: (...values) => Math.min(...values),
    max: (...values) => Math.max(...values),
    pow: (base, exponent) => base ** exponent,
  };
  const constants = { pi: Math.PI, e: Math.E, tau: Math.PI * 2, ans: advancedCalculatorLastAnswer, ...(options.vars || {}) };
  const tokens = calculatorTokensWithImplicitMultiplication(calculatorRawTokens(source), functions);
  let index = 0;
  const peek = () => tokens[index];
  const consume = token => {
    if (tokens[index] !== token) throw new Error(`Forventede "${token}".`);
    index += 1;
  };
  function expression() {
    let value = term();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[index++];
      const right = term();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }
  function term() {
    let value = power();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[index++];
      const right = power();
      value = op === '*' ? value * right : value / right;
    }
    return value;
  }
  function power() {
    let value = postfix();
    if (peek() === '^') {
      index += 1;
      value **= power();
    }
    return value;
  }
  function postfix() {
    let value = primary();
    while (peek() === '!' || peek() === '%') {
      const op = tokens[index++];
      value = op === '!' ? calculatorFactorial(value) : value / 100;
    }
    return value;
  }
  function readFunctionArgs(name) {
    consume('(');
    const args = [];
    if (peek() !== ')') {
      while (index < tokens.length) {
        args.push(expression());
        if (peek() !== ',') break;
        index += 1;
      }
    }
    consume(')');
    if (!args.length) throw new Error(`${name}(...) mangler et argument.`);
    return args;
  }
  function primary() {
    const token = tokens[index++];
    if (token === '+') return primary();
    if (token === '-') return -primary();
    if (token === '(') {
      const value = expression();
      consume(')');
      return value;
    }
    if (/^\d/.test(token || '')) return Number(token);
    if (/^[a-zA-Z_]\w*$/.test(token || '')) {
      if (functions[token]) return functions[token](...readFunctionArgs(token));
      if (Object.prototype.hasOwnProperty.call(constants, token)) return constants[token];
      throw new Error(`Ukendt navn: ${token}`);
    }
    throw new Error(`Uventet symbol: ${token || 'slut'}`);
  }
  const value = expression();
  if (index !== tokens.length) throw new Error(`Uventet symbol: ${tokens[index]}`);
  if (!Number.isFinite(value)) throw new Error('Resultatet er ikke et endeligt tal.');
  return value;
}

function parseCalculatorVariables(text, options = {}) {
  const vars = {};
  const protectedNames = new Set(['pi', 'e', 'tau', 'ans', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'abs', 'ln', 'log', 'exp', 'floor', 'ceil', 'round', 'min', 'max', 'pow']);
  String(text || '').split(/\n|;/).map(line => line.trim()).filter(Boolean).forEach(line => {
    const match = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (!match) throw new Error(`Variablen "${line}" skal skrives som navn = udtryk.`);
    const [, name, expr] = match;
    if (protectedNames.has(name)) throw new Error(`${name} er reserveret i lommeregneren.`);
    vars[name] = evaluateCalculatorExpression(expr, { ...options, vars });
  });
  return vars;
}

function formatCalculatorNumber(value, precision = 12) {
  const digits = Math.min(16, Math.max(4, Number(precision) || 12));
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  return Number(value.toPrecision(digits)).toString();
}

function openAcademicCalculator(kind) {
  let dialog = $('#academicCalculatorDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'academicCalculatorDialog';
    dialog.className = 'academic-calculator-dialog';
    dialog.innerHTML = `<div class="modal">
      <div class="modal-head"><div><span class="engineering-tag">BEREGN OG INDSÆT</span><h2 id="academicCalculatorTitle">Værktøj</h2><p class="modal-subtitle" id="academicCalculatorHint"></p></div><button type="button" class="modal-close" data-academic-close>×</button></div>
      <div id="academicCalculatorFields"></div>
      <div class="academic-calculator-result" id="academicCalculatorResult"></div>
      <div class="modal-actions"><button type="button" class="btn-outline" data-academic-close>Annuller</button><button type="button" class="btn-outline" id="insertAcademicResult">Indsæt resultat</button><button type="button" class="btn-primary" id="calculateAcademicResult">Beregn</button></div>
    </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
      const calcInsert = event.target.closest('[data-calc-insert]');
      if (calcInsert) {
        const input = $('#calculatorExpression');
        if (input) {
          input.value += calcInsert.dataset.calcInsert;
          input.focus();
        }
      }
      if (event.target.closest('[data-calc-clear]')) {
        const input = $('#calculatorExpression');
        if (input) input.value = '';
        $('#academicCalculatorResult').innerHTML = '<p>Skriv et udtryk og tryk Beregn.</p>';
        delete $('#academicCalculatorResult').dataset.ready;
      }
      if (event.target.closest('[data-calc-ans]')) {
        const input = $('#calculatorExpression');
        if (input) {
          input.value += 'ans';
          input.focus();
        }
      }
      if (event.target.closest('[data-academic-close]')) dialog.close();
      if (event.target.closest('#calculateAcademicResult')) calculateAcademicTool(dialog.dataset.kind);
      if (event.target.closest('#insertAcademicResult')) {
        const result = $('#academicCalculatorResult');
        if (!result?.dataset.ready) return alert('Beregn først.');
        const acHtml = `<section class="stem-block calculated-tool"><h4>${escapeHtml($('#academicCalculatorTitle').textContent)}</h4>${result.innerHTML}</section><p><br></p>`;
        dialog.close();
        setTimeout(() => insertHtml(acHtml), 50);
      }
    });
  }
  const configs = {
    calculator: {
      title: 'Avanceret lommeregner',
      hint: 'Beregn udtryk med variable, trigonometriske funktioner, logaritmer, rødder, potenser og fakultet.',
      fields: `<div class="advanced-calculator">
        <div class="field advanced-calculator-expression"><label for="calculatorExpression">Udtryk</label><input id="calculatorExpression" value="sin(pi/6)^2 + cos(pi/6)^2" autocomplete="off"></div>
        <div class="calculator-keypad" aria-label="Lommeregnerknapper">
          ${['7','8','9','/','sqrt(','4','5','6','*','^','1','2','3','-','log(','0','.','pi','+','ln(','(',')','sin(','cos(','tan(','!','abs(','exp(','ans','%'].map(key => `<button type="button" data-calc-insert="${escapeHtml(key)}">${escapeHtml(key)}</button>`).join('')}
          <button type="button" data-calc-clear>AC</button>
          <button type="button" data-calc-ans>Ans</button>
        </div>
        <div class="calculator-options">
          <div class="field"><label for="calculatorAngleMode">Vinkel</label><select id="calculatorAngleMode"><option value="rad">Radianer</option><option value="deg">Grader</option></select></div>
          <div class="field"><label for="calculatorPrecision">Præcision</label><select id="calculatorPrecision"><option value="8">8 cifre</option><option value="12" selected>12 cifre</option><option value="16">16 cifre</option></select></div>
          <div class="field calculator-vars"><label for="calculatorVariables">Variable</label><textarea id="calculatorVariables" placeholder="a = 9&#10;b = sqrt(a)"></textarea></div>
        </div>
      </div>`,
    },
    matrix: {
      title: 'Matrixberegner',
      hint: 'Beregn determinant og invers for en 2 × 2 matrix.',
      fields: `<div class="matrix-input-grid"><input id="matrixA" type="number" step="any" value="1"><input id="matrixB" type="number" step="any" value="2"><input id="matrixC" type="number" step="any" value="3"><input id="matrixD" type="number" step="any" value="4"></div>`,
    },
    statistics: {
      title: 'Statistikberegner',
      hint: 'Indsæt tal adskilt med komma, mellemrum eller linjeskift.',
      fields: `<div class="field"><label for="statisticsValues">Datasæt</label><textarea id="statisticsValues">2, 4, 4, 6, 8</textarea></div>`,
    },
    convert: {
      title: 'Enhedskonverter',
      hint: 'Konvertér mellem enheder inden for samme fysiske størrelse.',
      fields: `<div class="converter-grid"><input id="convertValue" type="number" step="any" value="1"><select id="convertFrom"><option>m</option><option>cm</option><option>mm</option><option>km</option><option>kg</option><option>g</option><option>s</option><option>min</option><option>h</option><option>m/s</option><option>km/h</option></select><span>til</span><select id="convertTo"><option>cm</option><option>m</option><option>mm</option><option>km</option><option>g</option><option>kg</option><option>min</option><option>s</option><option>h</option><option>km/h</option><option>m/s</option></select></div>`,
    },
    formula: {
      title: 'Formelbibliotek',
      hint: 'Vælg en formel og indsæt den med forklaring.',
      fields: `<div class="field"><label for="formulaChoice">Formel</label><select id="formulaChoice">
        <option value="newton">Newtons 2. lov · F = m · a</option><option value="energy">Kinetisk energi · Eₖ = ½mv²</option>
        <option value="ohm">Ohms lov · V = I · R</option><option value="pythagoras">Pythagoras · a² + b² = c²</option>
        <option value="quadratic">Andengradsligning · x = (−b ± √(b²−4ac)) / 2a</option><option value="bayes">Bayes · P(A|B) = P(B|A)P(A)/P(B)</option>
        <option value="npv">Nutidsværdi · NPV = Σ CFₜ/(1+r)ᵗ</option><option value="idealGas">Idealgasloven · pV = nRT</option>
      </select></div>`,
    },
  };
  const config = configs[kind];
  if (!config) return false;
  dialog.dataset.kind = kind;
  $('#academicCalculatorTitle').textContent = config.title;
  $('#academicCalculatorHint').textContent = config.hint;
  $('#academicCalculatorFields').innerHTML = config.fields;
  $('#academicCalculatorResult').innerHTML = '<p>Udfyld felterne og tryk Beregn.</p>';
  delete $('#academicCalculatorResult').dataset.ready;
  dialog.showModal();
  return true;
}

function calculateAcademicTool(kind) {
  const result = $('#academicCalculatorResult');
  if (!result) return;
  let html = '';
  try {
  if (kind === 'calculator') {
    const angleMode = $('#calculatorAngleMode')?.value || 'rad';
    const precision = Number($('#calculatorPrecision')?.value || 12);
    const expression = $('#calculatorExpression')?.value || '';
    const vars = parseCalculatorVariables($('#calculatorVariables')?.value || '', { angleMode });
    const value = evaluateCalculatorExpression(expression, { vars, angleMode });
    advancedCalculatorLastAnswer = value;
    const formatted = formatCalculatorNumber(value, precision);
    const varsHtml = Object.keys(vars).length
      ? `<p><b>Variable:</b> ${Object.entries(vars).map(([name, varValue]) => `${escapeHtml(name)} = ${escapeHtml(formatCalculatorNumber(varValue, precision))}`).join(', ')}</p>`
      : '';
    html = `<p class="math-line">${escapeHtml(expression)} = ${escapeHtml(formatted)}</p>${varsHtml}<p><b>Vinkel:</b> ${angleMode === 'deg' ? 'grader' : 'radianer'}</p>`;
  } else if (kind === 'matrix') {
    const [a, b, c, d] = ['matrixA', 'matrixB', 'matrixC', 'matrixD'].map(id => Number($(`#${id}`).value));
    const determinant = a * d - b * c;
    html = `<p class="math-line">A = [${a} ${b}; ${c} ${d}]</p><p><b>det(A):</b> ${determinant}</p>${Math.abs(determinant) < 1e-12 ? '<p>Matrixen er singulær og har ingen invers.</p>' : `<p><b>A⁻¹:</b> [${d / determinant} ${-b / determinant}; ${-c / determinant} ${a / determinant}]</p>`}`;
  } else if (kind === 'statistics') {
    const values = $('#statisticsValues').value.split(/[\s,;]+/).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    if (!values.length) return alert('Indsæt mindst ét tal.');
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const median = values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    html = `<p><b>n:</b> ${values.length}</p><p><b>Gennemsnit:</b> ${mean.toFixed(4)}</p><p><b>Median:</b> ${median}</p><p><b>Varians:</b> ${variance.toFixed(4)}</p><p><b>Standardafvigelse:</b> ${Math.sqrt(variance).toFixed(4)}</p>`;
  } else if (kind === 'convert') {
    const units = {
      m: ['length', 1], cm: ['length', .01], mm: ['length', .001], km: ['length', 1000],
      kg: ['mass', 1], g: ['mass', .001], s: ['time', 1], min: ['time', 60], h: ['time', 3600],
      'm/s': ['speed', 1], 'km/h': ['speed', 1 / 3.6],
    };
    const value = Number($('#convertValue').value);
    const from = $('#convertFrom').value;
    const to = $('#convertTo').value;
    if (units[from][0] !== units[to][0]) return alert('Vælg to enheder for samme fysiske størrelse.');
    const converted = value * units[from][1] / units[to][1];
    html = `<p class="math-line">${value} ${escapeHtml(from)} = ${Number(converted.toPrecision(10))} ${escapeHtml(to)}</p>`;
  } else if (kind === 'formula') {
    const formulas = {
      newton: ['F = m · a', 'Kraft er masse gange acceleration.'],
      energy: ['Eₖ = ½mv²', 'Kinetisk energi afhænger af masse og hastighed i anden.'],
      ohm: ['V = I · R', 'Spænding er strøm gange modstand.'],
      pythagoras: ['a² + b² = c²', 'For en retvinklet trekant.'],
      quadratic: ['x = (−b ± √(b²−4ac)) / 2a', 'Løsning af ax² + bx + c = 0.'],
      bayes: ['P(A|B) = P(B|A)P(A)/P(B)', 'Opdaterer en sandsynlighed med ny evidens.'],
      npv: ['NPV = Σ CFₜ/(1+r)ᵗ', 'Nutidsværdi af fremtidige pengestrømme.'],
      idealGas: ['pV = nRT', 'Sammenhæng mellem tryk, volumen, stofmængde og temperatur.'],
    };
    const [formula, explanation] = formulas[$('#formulaChoice').value];
    html = `<p class="math-line">${formula}</p><p>${explanation}</p>`;
  }
  } catch (error) {
    result.innerHTML = `<p><b>Fejl:</b> ${escapeHtml(error.message || 'Udtrykket kunne ikke beregnes.')}</p>`;
    delete result.dataset.ready;
    return;
  }
  result.innerHTML = html;
  result.dataset.ready = '1';
}

const LAST_LOGIN_EMAIL_KEY = 'noteit-last-email';
const REMEMBER_LOGIN_KEY = 'noteit-remember-email';
const LOGIN_EMAIL_HINT_KEY = 'noteit-login-hint';

const FORMULA_FRIENDLY_DOC_TYPES = new Set([
  'mathematics', 'statistics', 'physics', 'chemistry', 'biology', 'engineering',
  'civilEngineering', 'electricalEngineering', 'mechanicalEngineering', 'psychology',
  'tech', 'softwareEngineering', 'health', 'medicine', 'biotechnology',
]);

const QUICK_FORMULA_PRESETS = [
  { id: 'pythagoras', label: 'Pythagoras', formula: 'a² + b² = c²', note: 'Retvinklet trekant — c er hypotenusen' },
  { id: 'sin', label: 'sin', formula: 'sin θ = modstående / hypotenuse', note: '' },
  { id: 'cos', label: 'cos', formula: 'cos θ = hosliggende / hypotenuse', note: '' },
  { id: 'tan', label: 'tan', formula: 'tan θ = sin θ / cos θ', note: '' },
  { id: 'sinCos', label: 'sin²+cos²', formula: 'sin²θ + cos²θ = 1', note: '' },
  { id: 'square', label: 'Firkant', formula: 'A = s²', note: 'Areal af firkant med side s' },
  { id: 'rectangle', label: 'Rektangel', formula: 'A = l · b', note: 'Areal — længde gange bredde' },
  { id: 'triangle', label: 'Trekant', formula: 'A = ½ · b · h', note: '' },
  { id: 'circle', label: 'Cirkel', formula: 'A = πr²', note: '' },
  { id: 'quadratic', label: '2. grad', formula: 'x = (−b ± √(b²−4ac)) / 2a', note: 'ax² + bx + c = 0' },
  { id: 'newton', label: 'F = ma', formula: 'F = m · a', note: '' },
  { id: 'ohm', label: 'Ohm', formula: 'V = I · R', note: '' },
];

const FORMULA_PRESET_IDS_BY_DOC = {
  mathematics: ['pythagoras', 'sin', 'cos', 'tan', 'sinCos', 'square', 'rectangle', 'triangle', 'circle', 'quadratic'],
  statistics: ['quadratic', 'sinCos', 'circle'],
  physics: ['pythagoras', 'newton', 'ohm', 'quadratic', 'triangle'],
  chemistry: ['ohm', 'quadratic'],
  economics: ['quadratic', 'newton'],
  engineering: ['pythagoras', 'newton', 'ohm', 'quadratic'],
  default: ['pythagoras', 'sin', 'cos', 'square', 'rectangle', 'quadratic'],
};

function formulaPresetsForPage(page) {
  const ids = FORMULA_PRESET_IDS_BY_DOC[page?.docType] || FORMULA_PRESET_IDS_BY_DOC.default;
  return ids.map(id => QUICK_FORMULA_PRESETS.find(preset => preset.id === id)).filter(Boolean);
}

function pageHasFormulaTools(page) {
  return Boolean(page?.toolPacks?.includes('stem') || FORMULA_FRIENDLY_DOC_TYPES.has(page?.docType));
}

function insertEditableFormula(formula, explanation = '') {
  captureEditorRange();
  const noteHtml = explanation
    ? `<p class="formula-note">${escapeHtml(explanation)}</p>`
    : '';
  insertHtml(`<div class="formula-insert-block"><p class="math-line">${escapeHtml(formula)}</p>${noteHtml}</div><p><br></p>`);
}

function renderFormulaQuickRow(page) {
  if (!pageHasFormulaTools(page)) return '';
  const chips = formulaPresetsForPage(page).map(preset =>
    `<button type="button" class="tool formula-chip-tool" data-quick-formula="${preset.id}">${escapeHtml(preset.label)}</button>`
  ).join('');
  return `<div class="toolbar-row toolbar-stem formula-quick-row">
    <span class="row-label">Formler:</span>${chips}
    <button type="button" class="tool formula-library-tool" id="openFormulaLibrary">Bibliotek</button>
  </div>`;
}

const formulaLibraryData = [
  { category: 'Algebra', items: [
    ['Andengradsligning', 'x = (−b ± √(b²−4ac)) / 2a', 'Løsning af ligningen ax² + bx + c = 0.'],
    ['1. kvadratsætning', '(a+b)² = a² + 2ab + b²', 'Kvadratet på en sum.'],
    ['2. kvadratsætning', '(a−b)² = a² − 2ab + b²', 'Kvadratet på en differens.'],
    ['3. kvadratsætning (konjugatsætning)', '(a+b)(a−b) = a² − b²', 'Produktet af en sum og en differens.'],
    ['Potensregel – multiplikation', 'aᵘ · aᵛ = a^(u+v)', 'Lægger eksponenterne sammen ved multiplikation af potenser med samme grundtal.'],
    ['Potensregel – potens af potens', '(aᵘ)ᵛ = a^(u·v)', 'Multiplicer eksponenterne, når en potens opløftes i en ny potens.'],
    ['Logaritme af produkt', 'log_b(x·y) = log_b(x) + log_b(y)', 'Omdanner et produkt til en sum af logaritmer.'],
    ['Logaritme af potens', 'log_b(xⁿ) = n · log_b(x)', 'Eksponenten kan flyttes ud foran logaritmen.'],
    ['Eksponentiel udvikling', 'f(t) = a · bᵗ', 'Modellerer vækst (b>1) eller henfald (0<b<1) med startværdi a.'],
    ['Aritmetisk sum', 'Sₙ = n/2 · (a₁ + aₙ)', 'Summen af de n første led i en aritmetisk række.'],
    ['Geometrisk sum', 'Sₙ = a₁ · (1 − rⁿ)/(1 − r)', 'Summen af de n første led i en geometrisk række med kvotient r.'],
  ]},
  { category: 'Geometri', items: [
    ['Pythagoras', 'a² + b² = c²', 'Gælder for en retvinklet trekant, hvor c er hypotenusen.'],
    ['Firkant (areal)', 'A = s²', 'Arealet af en firkant med side s.'],
    ['Rektangel (areal)', 'A = l · b', 'Længde gange bredde.'],
    ['Trekants areal', 'A = ½ · b · h', 'Grundlinje gange højde divideret med 2.'],
    ['Cirklens omkreds', 'O = 2πr', 'Omkredsen af en cirkel med radius r.'],
    ['Cirklens areal', 'A = πr²', 'Arealet af en cirkel med radius r.'],
    ['Kuglens rumfang', 'V = 4/3 · πr³', 'Rumfanget af en kugle med radius r.'],
    ['Kuglens overfladeareal', 'A = 4πr²', 'Overfladearealet af en kugle med radius r.'],
    ['Cylinderens rumfang', 'V = πr²h', 'Rumfanget af en cylinder med radius r og højde h.'],
    ['Keglens rumfang', 'V = 1/3 · πr²h', 'Rumfanget af en kegle med radius r og højde h.'],
    ['Afstandsformel', 'd = √((x₂−x₁)² + (y₂−y₁)²)', 'Afstanden mellem to punkter i et koordinatsystem.'],
    ['Cosinusrelationen', 'c² = a² + b² − 2ab · cos(C)', 'Generaliseret Pythagoras for en vilkårlig trekant.'],
    ['Sinusrelationen', 'a/sin A = b/sin B = c/sin C', 'Forholdet mellem sider og modstående vinkler i en trekant.'],
  ]},
  { category: 'Trigonometri', items: [
    ['Sinus', 'sin θ = modstående / hypotenuse', 'For en retvinklet trekant.'],
    ['Cosinus', 'cos θ = hosliggende / hypotenuse', 'For en retvinklet trekant.'],
    ['Grundrelation', 'sin²θ + cos²θ = 1', 'Den fundamentale trigonometriske identitet.'],
    ['Tangens', 'tan θ = sin θ / cos θ', 'Definitionen af tangens ud fra sinus og cosinus.'],
    ['Dobbeltvinkel – sinus', 'sin(2θ) = 2 sin θ cos θ', 'Formel for sinus af det dobbelte af en vinkel.'],
    ['Dobbeltvinkel – cosinus', 'cos(2θ) = cos²θ − sin²θ', 'Formel for cosinus af det dobbelte af en vinkel.'],
    ['Additionsformel – sinus', 'sin(A ± B) = sinA cosB ± cosA sinB', 'Sinus af summen eller differensen af to vinkler.'],
    ['Additionsformel – cosinus', 'cos(A ± B) = cosA cosB ∓ sinA sinB', 'Cosinus af summen eller differensen af to vinkler.'],
    ['Grader til radianer', 'θ_rad = θ_grader · π/180', 'Omregning mellem grader og radianer.'],
    ['Enhedscirklen', 'Punkt: (cos θ, sin θ)', 'Et punkt på enhedscirklen svarende til vinklen θ.'],
    ['Periodicitet', 'sin(θ + 2π) = sin θ', 'Sinus og cosinus er periodiske med periode 2π.'],
    ['Sinuskurve', 'f(x) = A · sin(Bx + C) + D', 'Generel form for en sinuskurve med amplitude A, periode 2π/B, faseforskydning C og lodret forskydning D.'],
  ]},
  { category: 'Calculus / analyse', items: [
    ['Differentialkvotient (definition)', "f'(x) = lim_{h→0} (f(x+h) − f(x)) / h", 'Den afledede defineret som en grænseværdi.'],
    ['Epsilon-delta-definition', 'lim_{x→a} f(x) = L: for alle ε>0 findes δ>0, så 0<|x−a|<δ ⇒ |f(x)−L|<ε', 'Den præcise definition af en grænseværdi.'],
    ['Potensregel for differentiation', 'd/dx[xⁿ] = n · x^(n−1)', 'Differentiation af en potensfunktion.'],
    ['Kædereglen', "d/dx[f(g(x))] = f'(g(x)) · g'(x)", 'Differentiation af en sammensat funktion.'],
    ['Produktreglen', "d/dx[f·g] = f'g + fg'", 'Differentiation af et produkt af to funktioner.'],
    ['Kvotientreglen', "d/dx[f/g] = (f'g − fg') / g²", 'Differentiation af en kvotient af to funktioner.'],
    ['Analysens fundamentalsætning', "∫ₐᵇ f'(x) dx = f(b) − f(a)", 'Sammenhængen mellem integration og differentiation.'],
    ['Stamfunktion af potens', '∫xⁿ dx = x^(n+1)/(n+1) + C, n ≠ −1', 'Den generelle stamfunktion til en potensfunktion.'],
    ['Partiel integration', '∫u dv = uv − ∫v du', 'Bruges til at integrere produkter af funktioner.'],
    ['Taylorrækken', 'f(x) = Σ f⁽ⁿ⁾(a)/n! · (x−a)ⁿ', 'Approksimerer en funktion med en potensrække omkring punktet a.'],
    ['Maclaurinrækken for eˣ', 'eˣ = Σ xⁿ/n! = 1 + x + x²/2! + ...', 'Taylorrækken for eˣ omkring 0.'],
    ['L\'Hôpitals regel', "lim f/g = lim f'/g'", 'Anvendes til grænseværdier af typen 0/0 eller ∞/∞.'],
  ]},
  { category: 'Lineær algebra', items: [
    ['Matrixmultiplikation', '(AB)ᵢⱼ = Σₖ Aᵢₖ · Bₖⱼ', 'Element (i,j) i produktmatricen AB.'],
    ['Determinant (2×2)', 'det([a b; c d]) = ad − bc', 'Determinanten af en 2×2-matrix.'],
    ['Invers matrix (2×2)', 'A⁻¹ = 1/det(A) · [d −b; −c a]', 'Den inverse af en 2×2-matrix, når det(A) ≠ 0.'],
    ['Egenværdier', 'det(A − λI) = 0', 'Den karakteristiske ligning, hvis løsninger er egenværdierne λ.'],
    ['Vektorlængde (norm)', '|v| = √(v₁² + v₂² + ... + vₙ²)', 'Længden af en vektor i n dimensioner.'],
    ['Prikprodukt', 'u · v = |u||v| · cos θ', 'Det indre produkt af to vektorer.'],
    ['Krydsprodukt', 'u × v = |u||v| · sin θ · n̂', 'Vektorproduktet, der står vinkelret på begge vektorer.'],
    ['Lineær kombination', 'v = c₁v₁ + c₂v₂ + ... + cₙvₙ', 'En vektor udtrykt som en sum af skalerede basisvektorer.'],
  ]},
  { category: 'Sandsynlighed & statistik', items: [
    ['Bayes sætning', 'P(A|B) = P(B|A) · P(A) / P(B)', 'Opdaterer sandsynligheden for A givet ny evidens B.'],
    ['Binomialfordeling', 'P(X=k) = C(n,k) · pᵏ(1−p)ⁿ⁻ᵏ', 'Sandsynligheden for k succeser i n uafhængige forsøg.'],
    ['Normalfordeling (tæthed)', 'f(x) = 1/(σ√(2π)) · e^(−(x−μ)²/2σ²)', 'Tæthedsfunktionen for den normale fordeling.'],
    ['Middelværdi', 'E(X) = Σ xᵢ · P(xᵢ)', 'Den forventede værdi af en stokastisk variabel.'],
    ['Varians', 'Var(X) = E(X²) − (E(X))²', 'Et mål for spredningen af en stokastisk variabel.'],
    ['Standardafvigelse', 'σ = √(Var(X))', 'Kvadratroden af variansen.'],
    ['Kovarians', 'Cov(X,Y) = E[(X−μₓ)(Y−μᵥ)]', 'Et mål for, hvordan to variable varierer sammen.'],
    ['Korrelationskoefficient', 'r = Cov(X,Y) / (σₓ · σᵥ)', 'Et normeret mål (mellem -1 og 1) for lineær sammenhæng.'],
    ['Central grænseværdisætning', 'X̄ ~ N(μ, σ²/n) for store n', 'Stikprøvegennemsnittet er approksimativt normalfordelt.'],
    ['Konfidensinterval for middelværdi', 'X̄ ± z · σ/√n', 'Interval, der med en given sikkerhed indeholder den sande middelværdi.'],
  ]},
  { category: 'Fysik – mekanik', items: [
    ['Newtons 2. lov', 'F = m · a', 'Kraft er masse gange acceleration.'],
    ['Tyngdekraft', 'G = m · g', 'Tyngdekraften på en masse m nær Jordens overflade.'],
    ['Bevægelsesligning', 's = v₀t + ½at²', 'Tilbagelagt vej ved konstant acceleration.'],
    ['Hastighed ved konstant acceleration', 'v = v₀ + at', 'Hastighed efter tid t med konstant acceleration a.'],
    ['Kinetisk energi', 'Eₖ = ½mv²', 'Bevægelsesenergien af et objekt med masse m og hastighed v.'],
    ['Potentiel energi', 'Eₚ = mgh', 'Energien et objekt har i kraft af sin højde h.'],
    ['Impuls', 'p = m · v', 'Bevægelsesmængden af et objekt.'],
    ['Bevarelse af impuls', 'm₁v₁ + m₂v₂ = m₁v₁_efter + m₂v₂_efter', 'Den samlede impuls er bevaret i et isoleret system.'],
    ['Arbejde', 'W = F · s · cos θ', 'Arbejdet udført af en kraft F over en strækning s.'],
    ['Effekt', 'P = W / t', 'Arbejde udført per tidsenhed.'],
    ['Centripetalacceleration', 'a_c = v² / r', 'Accelerationen mod centrum ved cirkulær bevægelse.'],
    ['Newtons gravitationslov', 'F = G · m₁m₂ / r²', 'Gravitationskraften mellem to masser i afstanden r.'],
  ]},
  { category: 'Fysik – elektromagnetisme', items: [
    ['Ohms lov', 'V = I · R', 'Spænding er strøm gange modstand.'],
    ['Elektrisk effekt', 'P = V · I', 'Effekten i et kredsløb som produktet af spænding og strøm.'],
    ['Coulombs lov', 'F = k · q₁q₂ / r²', 'Den elektriske kraft mellem to ladninger.'],
    ['Kapacitans', 'C = Q / V', 'Forholdet mellem ladning og spænding på en kondensator.'],
    ['Elektrisk felt', 'E = F / q', 'Kraften per ladningsenhed i et elektrisk felt.'],
    ['Magnetisk kraft', 'F = qvB · sin θ', 'Kraften på en ladning, der bevæger sig i et magnetfelt.'],
    ['Faradays induktionslov', 'ε = −dΦ/dt', 'Den inducerede spænding er lig den negative ændring i magnetisk flux.'],
    ['Modstande i kredsløb', 'R_serie = R₁+R₂+...   1/R_parallel = 1/R₁+1/R₂+...', 'Sammenlægning af modstande i serie- og parallelforbindelser.'],
  ]},
  { category: 'Termodynamik, bølger & kvante', items: [
    ['Idealgasloven', 'pV = nRT', 'Sammenhæng mellem tryk, volumen, stofmængde og temperatur for en idealgas.'],
    ['Termisk energi', 'Q = mcΔT', 'Varmemængde nødvendig for at ændre temperaturen af en masse m.'],
    ['Entropi', 'ΔS = Q / T', 'Ændring i entropi ved varmeoverførsel ved temperatur T.'],
    ['Bølgeligning', 'v = f · λ', 'Sammenhæng mellem bølgehastighed, frekvens og bølgelængde.'],
    ['Fotonenergi', 'E = h · f', 'Energien af en foton afhænger af dens frekvens.'],
    ['de Broglie-bølgelængde', 'λ = h / p', 'Bølgelængden associeret med en partikel med impuls p.'],
    ['Heisenbergs usikkerhedsrelation', 'Δx · Δp ≥ ℏ/2', 'Den fundamentale grænse for samtidig præcision af position og impuls.'],
    ['Schrödingers ligning (tidsuafhængig)', '−ℏ²/2m · d²ψ/dx² + Vψ = Eψ', 'Den grundlæggende ligning for en partikels bølgefunktion ψ.'],
    ['Masse-energi-relation', 'E = mc²', 'Energi og masse er ækvivalente.'],
    ['Dopplereffekt', "f' = f · (v ± v₀)/(v ∓ vₛ)", 'Ændring i observeret frekvens på grund af relativ bevægelse mellem kilde og observatør.'],
  ]},
  { category: 'Kemi', items: [
    ['Stofmængde', 'n = m / M', 'Stofmængden ud fra masse og molær masse.'],
    ['Idealgasloven (kemi)', 'pV = nRT', 'Samme lov som i fysik, ofte brugt for gasreaktioner.'],
    ['pH', 'pH = −log[H⁺]', 'Et mål for syrligheden af en opløsning.'],
    ['Koncentration', 'c = n / V', 'Stofmængde per volumen.'],
    ['Reaktionshastighed (1. orden)', 'r = k[A]', 'Hastigheden af en 1.-ordens reaktion er proportional med koncentrationen.'],
    ['Ligevægtskonstant', 'K = [C]^c[D]^d / [A]^a[B]^b', 'Forholdet mellem produkt- og reaktantkoncentrationer ved ligevægt.'],
    ['Arrhenius ligning', 'k = A · e^(−Eₐ/RT)', 'Sammenhæng mellem reaktionshastighedskonstant og temperatur.'],
    ['Gibbs fri energi', 'ΔG = ΔH − TΔS', 'Bestemmer om en reaktion er spontan (ΔG < 0).'],
    ['Faradays elektrolyselov', 'm = (M · I · t) / (n · F)', 'Masse af stof udskilt ved elektrolyse.'],
    ['Ideel opløsning', 'p = x · p*', 'Damptryk over en ideel blanding (Raoults lov).'],
  ]},
  { category: 'Vektorregning', items: [
    ['Gradient', '∇f = (∂f/∂x, ∂f/∂y, ∂f/∂z)', 'Vektor af partielafledede – peger mod steepest ascent.'],
    ['Divergens', '∇·F = ∂Fₓ/∂x + ∂Fᵧ/∂y + ∂F_z/∂z', 'Måler kilder og sænke i et vektorfelt.'],
    ['Rotation (curl)', '∇×F', 'Måler rotation i et vektorfelt.'],
    ['Linjeintegral', '∫_C F·dr', 'Integration af et vektorfelt langs en kurve.'],
    ['Fladeintegral', '∫∫_S F·dS', 'Integration over en flade.'],
    ['Stokes sætning', '∮_C F·dr = ∫∫_S (∇×F)·dS', 'Sammenhæng mellem linje- og fladeintegral.'],
    ['Gauss sætning', '∮_S F·dS = ∫∫∫_V (∇·F) dV', 'Sammenhæng mellem flade- og rumintegral.'],
  ]},
  { category: 'Differentialligninger', items: [
    ['Separabel ligning', 'dy/dx = g(x)h(y)', 'Separér variable og integrér begge sider.'],
    ['2. ordens homogen', 'ay″ + by′ + cy = 0', 'Løs via karakteristisk ligning ar² + br + c = 0.'],
    ['Laplace-transform', 'ℒ{f(t)} = ∫₀^∞ e^{-st} f(t) dt', 'Omdanner differentialligninger til algebra.'],
    ['Fourier-transform', 'F(ω) = ∫ f(t) e^{-iωt} dt', 'Frekvensdomæne-repræsentation af funktioner.'],
    ['Varmeledningsligning', '∂u/∂t = α ∂²u/∂x²', 'Beskriver spredning af varme i et medium.'],
    ['Bølgeligning', '∂²u/∂t² = c² ∂²u/∂x²', 'Beskriver udbredelse af bølger.'],
  ]},
  { category: 'Økonomi & finans', items: [
    ['Rentes rente', 'A = P(1 + r)^n', 'Fremtidig værdi ved sammensat rente.'],
    ['Nutidsværdi', 'PV = FV / (1 + r)^n', 'Diskontering af fremtidig betaling.'],
    ['Annuitet', 'PMT = P · r(1+r)^n / ((1+r)^n − 1)', 'Fast betaling på et lån.'],
    ['Elasticitet', 'ε = (ΔQ/Q) / (ΔP/P)', 'Priselasticitet af efterspørgsel.'],
  ]},
];

function ensureFormulaLibraryDialog() {
  let dialog = $('#formulaLibraryDialog');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'formulaLibraryDialog';
  dialog.className = 'formula-library-dialog';
  dialog.innerHTML = `<div class="modal">
    <div class="modal-head"><div><span class="engineering-tag">FORMELBIBLIOTEK</span><h2>Alle formler</h2><p class="modal-subtitle">Søg, gennemse og indsæt formler direkte i din note.</p></div><button type="button" class="modal-close" data-formula-library-close>×</button></div>
    <input type="search" id="formulaLibrarySearch" class="formula-library-search" placeholder="Søg efter formel, fx 'Pythagoras' eller 'epsilon'">
    <div class="formula-library-body" id="formulaLibraryBody">
      ${formulaLibraryData.map(cat => `<section class="formula-library-category" data-formula-category>
        <h3>${escapeHtml(cat.category)}</h3>
        <div class="formula-library-grid">
          ${cat.items.map(([name, formula, explanation]) => `<article class="formula-library-item" data-formula-search="${escapeHtml((`${name} ${formula} ${explanation}`).toLowerCase())}">
            <div class="formula-library-item-head"><b>${escapeHtml(name)}</b><button type="button" class="btn-outline" data-insert-formula="${escapeHtml(formula)}" data-insert-formula-explain="${escapeHtml(explanation)}">Indsæt</button></div>
            <p class="math-line">${escapeHtml(formula)}</p>
            <p class="formula-library-explain">${escapeHtml(explanation)}</p>
          </article>`).join('')}
        </div>
      </section>`).join('')}
    </div>
    <div class="modal-actions"><button type="button" class="btn-outline" data-formula-library-close>Luk</button></div>
  </div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-formula-library-close]')) { dialog.close(); return; }
    const insertBtn = event.target.closest('[data-insert-formula]');
    if (insertBtn) {
      const formula = insertBtn.dataset.insertFormula;
      const explanation = insertBtn.dataset.insertFormulaExplain || '';
      dialog.close();
      setTimeout(() => insertEditableFormula(formula, explanation), 50);
    }
  });
  dialog.addEventListener('input', event => {
    if (event.target.id !== 'formulaLibrarySearch') return;
    const query = event.target.value.trim().toLowerCase();
    dialog.querySelectorAll('[data-formula-category]').forEach(section => {
      let visibleCount = 0;
      section.querySelectorAll('[data-formula-search]').forEach(item => {
        const match = !query || item.dataset.formulaSearch.includes(query);
        item.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      section.style.display = visibleCount ? '' : 'none';
    });
  });
  return dialog;
}

function openFormulaLibrary() {
  captureEditorRange();
  const dialog = ensureFormulaLibraryDialog();
  const search = $('#formulaLibrarySearch');
  if (search) search.value = '';
  dialog.querySelectorAll('[data-formula-category], [data-formula-search]').forEach(el => { el.style.display = ''; });
  dialog.showModal();
}

function openModelWithTemplate(template) {
  captureEditorRange();
  if (!modelTemplates[template]) template = inferredModelTemplate();
  modelState = { template, mode: 'paint', color: modelColors[0], colors: {}, pins: [], selectedPart: '', pending: null };
  renderModelDialog();
  $('#modelDialog')?.showModal();
}

const figureToolTemplates = {
  brainMap: 'brain', memoryModel: 'memoryModel', cognition: 'cognition', robotFlow: 'robotFlow',
  algorithmFig: 'algorithmFlow', dataStructFig: 'dataStructure', networkFig: 'network', neuralNetFig: 'neuralNetwork',
  cellFig: 'cell', moleculeFig: 'molecule', photosynthesisFig: 'photosynthesis', dnaFig: 'dna', proteinFig: 'protein',
  immuneFig: 'immune', anatomyFig: 'anatomy', heartFig: 'heartModel', ecosystemFig: 'ecosystem', foodChainFig: 'foodChain',
  circuitFig: 'circuit', robotArmFig: 'robot', controlFig: 'controlSystem', mechanicsFig: 'mechanics', waveFig: 'waveModel',
  geometryFig: 'geometry', functionFig: 'functionGraph', calculusFig: 'calculus', probabilityFig: 'probability', matrixFig: 'matrixMap', vennFig: 'vennDiagram',
  economicsFig: 'economics', accountingFig: 'accounting', swotFig: 'swotBoard', demandSupplyFig: 'economics',
  lawFig: 'law', societyFig: 'society', stakeholderFig: 'stakeholderMap',
  languageFig: 'language', rhetoricFig: 'rhetoric',
  philosophyFig: 'philosophy', sourceFig: 'sourceAnalysis', timelineFig: 'timeline', researchFig: 'researchDesign',
  maslowFig: 'maslow', learningFig: 'learningCycle', stressFig: 'stressModel', experimentFig: 'experimentFlow',
  softwareFig: 'softwareArchitecture', databaseFig: 'database', cybersecurityFig: 'cybersecurity',
  musicFormFig: 'musicStructure',
};

const MUSIC_NOTE_FREQ = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50,
};
const MUSIC_STAFF_PITCHES = {
  treble: ['F5', 'E5', 'D5', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4'],
  bass: ['A3', 'G3', 'F3', 'E3', 'D3', 'C3', 'B2', 'A2', 'G2'],
  alto: ['E4', 'D4', 'C4', 'B3', 'A3', 'G3', 'F3', 'E3', 'D3'],
};
const MUSIC_STAFF_Y = [8, 22, 36, 50, 64];
let musicEditorState = { clef: 'treble', timeSig: '4/4', key: 'C-dur', tempo: 80, duration: 'quarter', notes: [] };

function musicPitchFromY(y, clef = 'treble') {
  const pitches = MUSIC_STAFF_PITCHES[clef] || MUSIC_STAFF_PITCHES.treble;
  const lineGap = 14;
  const bottomY = 64;
  const step = Math.round((bottomY - y) / (lineGap / 2));
  const index = Math.max(0, Math.min(pitches.length - 1, step));
  return pitches[index];
}

function musicNoteSvg(note, x) {
  const y = note.y;
  const dur = note.duration || 'quarter';
  const stemUp = y > 36;
  const stemX = stemUp ? x + 11 : x - 1;
  const stemY1 = stemUp ? y - 4 : y + 12;
  const stemY2 = stemUp ? y - 34 : y + 34;
  const head = dur === 'whole'
    ? `<ellipse cx="${x + 5}" cy="${y + 4}" rx="9" ry="7" fill="none" stroke="#1a1028" stroke-width="2"/>`
    : dur === 'half'
      ? `<ellipse cx="${x + 5}" cy="${y + 4}" rx="9" ry="7" fill="#fff" stroke="#1a1028" stroke-width="2"/>`
      : `<ellipse cx="${x + 5}" cy="${y + 4}" rx="9" ry="7" fill="#1a1028" stroke="#1a1028" stroke-width="1.5"/>`;
  const stem = dur === 'whole' ? '' : `<line x1="${stemX}" y1="${stemY1}" x2="${stemX}" y2="${stemY2}" stroke="#1a1028" stroke-width="2"/>`;
  const flag = dur === 'eighth' && stemUp ? `<path d="M${stemX} ${stemY2} q10 4 8 14" fill="none" stroke="#1a1028" stroke-width="2"/>` : dur === 'eighth' ? `<path d="M${stemX} ${stemY2} q-10 -4 -8 -14" fill="none" stroke="#1a1028" stroke-width="2"/>` : '';
  const ledger = y < 8 ? `<line x1="${x - 4}" y1="8" x2="${x + 14}" y2="8" stroke="#1a1028" stroke-width="1.5"/>` : y > 64 ? `<line x1="${x - 4}" y1="64" x2="${x + 14}" y2="64" stroke="#1a1028" stroke-width="1.5"/>` : '';
  return `<g class="music-note-glyph" data-note-id="${note.id}">${ledger}${head}${stem}${flag}</g>`;
}

function renderMusicStaffPreview() {
  const preview = $('#musicStaffPreview');
  if (!preview) return;
  const clefSymbol = musicEditorState.clef === 'bass' ? '𝄢' : musicEditorState.clef === 'alto' ? '𝄡' : '𝄞';
  const lines = MUSIC_STAFF_Y.map(y => `<line x1="58" y1="${y}" x2="560" y2="${y}" stroke="#2d2540" stroke-width="1.5"/>`).join('');
  const notes = [...musicEditorState.notes].sort((a, b) => a.x - b.x).map(note => musicNoteSvg(note, note.x)).join('');
  preview.innerHTML = `<div class="music-staff-canvas-wrap">
    <svg class="music-staff-canvas" viewBox="0 0 580 78" role="img" aria-label="Nodelinjer">
      <rect width="580" height="78" fill="#fffdf8" rx="8"/>
      ${lines}
      <text x="18" y="46" font-size="42" fill="#2d2540">${clefSymbol}</text>
      <text x="58" y="18" font-size="13" font-weight="700" fill="#5a5070">${escapeHtml(musicEditorState.timeSig)}</text>
      <g id="musicNotesLayer">${notes}</g>
    </svg>
    <p class="music-staff-hint">Klik på linjerne for at sætte noder · Vælg nodevarighed ovenfor · Afspil for at høre melodien</p>
  </div>`;
}

async function playMusicStaffNotes() {
  const notes = [...musicEditorState.notes].sort((a, b) => a.x - b.x);
  if (!notes.length) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return alert('Din browser understøtter ikke lydafspilning.');
  const ctx = new AudioCtx();
  const beatMs = 60000 / Math.max(40, Number(musicEditorState.tempo) || 80);
  const durationMap = { whole: beatMs * 4, half: beatMs * 2, quarter: beatMs, eighth: beatMs / 2 };
  let when = ctx.currentTime + 0.05;
  notes.forEach(note => {
    const freq = MUSIC_NOTE_FREQ[note.pitch];
    if (!freq) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const dur = (durationMap[note.duration] || beatMs) / 1000;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.22, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    when += dur * 0.92;
  });
}

function openMusicNotationDialog(mode = 'notation') {
  captureEditorRange();
  musicEditorState = { clef: 'treble', timeSig: '4/4', key: 'C-dur', tempo: 80, duration: 'quarter', notes: [] };
  let dialog = $('#musicNotationDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'musicNotationDialog';
    dialog.className = 'music-notation-dialog';
    dialog.innerHTML = `<div class="modal music-notation-modal">
      <div class="modal-head"><div><span class="engineering-tag">MUSIK</span><h2 id="musicNotationTitle">Nodelinjer</h2><p class="modal-subtitle" id="musicNotationSubtitle">Klik på nodearket, sæt noder ind og afspil melodien</p></div><button type="button" class="modal-close" data-music-notation-close>×</button></div>
      <div class="music-notation-grid">
        <div class="field"><label for="musicClef">Nøgle</label><select id="musicClef"><option value="treble">Violin (G)</option><option value="bass">Bas (F)</option><option value="alto">Alto (C)</option></select></div>
        <div class="field"><label for="musicTimeSig">Taktart</label><input id="musicTimeSig" placeholder="Fx 4/4" value="4/4"></div>
        <div class="field"><label for="musicKey">Toneart</label><input id="musicKey" placeholder="Fx C-dur / a-mol" value="C-dur"></div>
        <div class="field"><label for="musicTempo">Tempo (♩/min)</label><input id="musicTempo" type="number" min="40" max="220" value="80"></div>
      </div>
      <div class="music-duration-bar">
        <span>Nodevarighed:</span>
        <button type="button" class="music-dur-btn active" data-music-duration="quarter" title="Fjerdedelsnode">♩</button>
        <button type="button" class="music-dur-btn" data-music-duration="half" title="Halvnode">𝅗𝅥</button>
        <button type="button" class="music-dur-btn" data-music-duration="whole" title="Helnode">𝅝</button>
        <button type="button" class="music-dur-btn" data-music-duration="eighth" title="Ottendedelsnode">♪</button>
        <button type="button" class="btn-outline music-staff-action" id="undoMusicNote">Fortryd</button>
        <button type="button" class="btn-outline music-staff-action" id="clearMusicNotes">Ryd</button>
        <button type="button" class="btn-primary music-staff-action" id="playMusicStaff">▶ Afspil</button>
      </div>
      <div class="music-staff-preview" id="musicStaffPreview"></div>
      <div class="modal-actions"><button type="button" class="btn-outline" data-music-notation-close>Annuller</button><button type="button" class="btn-primary" id="insertMusicNotation">Indsæt i noter</button></div>
    </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-music-notation-close]')) dialog.close();
      const staffSvg = event.target.closest('.music-staff-canvas');
      if (staffSvg && dialog.open) {
        const rect = staffSvg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 580;
        const y = ((event.clientY - rect.top) / rect.height) * 78;
        if (x >= 52 && y >= 0 && y <= 78) {
          const snappedY = MUSIC_STAFF_Y.reduce((best, lineY) => Math.abs(lineY - y) < Math.abs(best - y) ? lineY : best, MUSIC_STAFF_Y[0]);
          const spaceY = y < snappedY ? snappedY - 7 : snappedY + 7;
          const finalY = Math.abs(y - snappedY) <= Math.abs(y - spaceY) ? snappedY : spaceY;
          const pitch = musicPitchFromY(finalY, musicEditorState.clef);
          musicEditorState.notes.push({ id: uid(), x: Math.round(x), y: finalY, pitch, duration: musicEditorState.duration });
          renderMusicStaffPreview();
        }
        return;
      }
      const durBtn = event.target.closest('[data-music-duration]');
      if (durBtn) {
        musicEditorState.duration = durBtn.dataset.musicDuration;
        dialog.querySelectorAll('[data-music-duration]').forEach(btn => btn.classList.toggle('active', btn === durBtn));
      }
      if (event.target.closest('#undoMusicNote')) {
        musicEditorState.notes.pop();
        renderMusicStaffPreview();
      }
      if (event.target.closest('#clearMusicNotes')) {
        musicEditorState.notes = [];
        renderMusicStaffPreview();
      }
      if (event.target.closest('#playMusicStaff')) playMusicStaffNotes();
      if (event.target.closest('#insertMusicNotation')) {
        const clef = $('#musicClef')?.value || 'treble';
        const time = $('#musicTimeSig')?.value.trim() || '4/4';
        const key = $('#musicKey')?.value.trim() || '';
        const tempo = $('#musicTempo')?.value.trim() || '80';
        const clefSymbol = clef === 'bass' ? '𝄢' : clef === 'alto' ? '𝄡' : '𝄞';
        const sorted = [...musicEditorState.notes].sort((a, b) => a.x - b.x);
        const noteLayer = sorted.map(note => musicNoteSvg(note, 80 + sorted.indexOf(note) * 42)).join('');
        const lines = MUSIC_STAFF_Y.map(y => `<line x1="48" y1="${y}" x2="520" y2="${y}" stroke="#2d2540" stroke-width="1.5"/>`).join('');
        const pitchList = sorted.map(note => note.pitch).join(' – ');
        const html = `<section class="music-staff-insert" contenteditable="false" data-music-tempo="${escapeHtml(tempo)}">
          <header><span>${clefSymbol}</span><b>${escapeHtml(time)}</b><small>${escapeHtml(key)} · ♩ = ${escapeHtml(tempo)}</small><button type="button" class="music-play-embedded" data-play-music-notes>▶ Afspil</button></header>
          <svg class="music-staff-embedded" viewBox="0 0 540 78" role="img"><rect width="540" height="78" fill="#fffdf8" rx="6"/>${lines}<text x="10" y="46" font-size="36">${clefSymbol}</text><g>${noteLayer}</g></svg>
          <p class="music-staff-notes">${escapeHtml(pitchList || 'Ingen noder')}</p>
        </section><p><br></p>`;
        dialog.close();
        setTimeout(() => insertHtml(html), 50);
      }
    });
    ['musicClef', 'musicTimeSig', 'musicKey', 'musicTempo'].forEach(id => {
      document.addEventListener('change', e => {
        if (!dialog.open) return;
        if (e.target.id === 'musicClef') musicEditorState.clef = e.target.value;
        if (e.target.id === 'musicTimeSig') musicEditorState.timeSig = e.target.value;
        if (e.target.id === 'musicKey') musicEditorState.key = e.target.value;
        if (e.target.id === 'musicTempo') musicEditorState.tempo = Number(e.target.value) || 80;
        if (e.target.id === 'musicClef') renderMusicStaffPreview();
      });
    });
  }
  const titles = { notation: 'Nodelinjer', chords: 'Akkorder', rhythm: 'Rytme', earTraining: 'Hørelære' };
  const subtitles = {
    notation: 'Klik på nodearket for at placere noder – afspil for at høre melodien',
    chords: 'Sæt akkordnoder på linjerne og afspil harmonien',
    rhythm: 'Byg et rytmisk mønster med forskellige nodevarigheder',
    earTraining: 'Træn øret ved at sætte noder ind og sammenligne med det du hører',
  };
  $('#musicNotationTitle').textContent = titles[mode] || 'Musiknotation';
  const subtitle = $('#musicNotationSubtitle');
  if (subtitle) subtitle.textContent = subtitles[mode] || subtitles.notation;
  dialog.dataset.mode = mode;
  musicEditorState = { clef: 'treble', timeSig: '4/4', key: 'C-dur', tempo: 80, duration: 'quarter', notes: [] };
  dialog.showModal();
  renderMusicStaffPreview();
}

function runStemTool(name) {
  captureEditorRange();
  const actions = {
    notation: () => openMusicNotationDialog('notation'),
    chords: () => openMusicNotationDialog('chords'),
    rhythm: () => openMusicNotationDialog('rhythm'),
    earTraining: () => openMusicNotationDialog('earTraining'),
    mechanics: () => openUniversityToolDialog('mechanics', 'Mekanik', ['System og antagelser', 'Kræfter og diagram', 'Ligninger', 'Udregning', 'Fortolkning'], 'stem'),
    matrix: () => openAcademicCalculator('matrix'),
    algebra: () => openEquationSolver(),
    equationSolver: () => openEquationSolver(),
    angles: () => openUniversityToolDialog('angles', L(noteLang(), 'tools.angles'), ['Figur og vinkeltype', 'Givne vinkler', 'Sætning eller relation', 'Beregning', 'Resultat'], 'stem'),
    integral: () => openUniversityToolDialog('integral', 'Integral', ['Funktion', 'Grænser', 'Stamfunktion', 'Udregning', 'Fortolkning'], 'stem'),
    derivative: () => openUniversityToolDialog('derivative', 'Differentiation', ['Funktion', 'Punkt eller interval', 'Differentiationsregel', 'Udregning', 'Fortolkning'], 'stem'),
    statistics: () => openAcademicCalculator('statistics'),
    graph: () => { resetDrawing(); $('#graphExpression').value = 'sin(x)'; $('#graphDialog').showModal(); setTimeout(plotFunction, 100); },
    formula: () => openAcademicCalculator('formula'),
    latex: () => { $('#mathInput').value = ''; $('#mathPreview').innerHTML = ''; $('#mathDialog').showModal(); },
    algorithm: () => openUniversityToolDialog('algorithm', L(noteLang(), 'tools.algorithm'), ['Formål og krav', 'Input', 'Forventet output', 'Algoritme trin for trin', 'Test og kompleksitet'], 'coding'),
    table: () => insertHtml('<table><tr><th></th><th></th></tr><tr><td></td><td></td></tr></table><p><br></p>'),
    siUnits: () => openUniversityToolDialog('siUnits', L(noteLang(), 'tools.siUnits'), ['Størrelse', 'Oprindelig værdi og enhed', 'SI enhed', 'Omregning', 'Enhedskontrol'], 'stem'),
    convert: () => openAcademicCalculator('convert'),
    labReport: () => openUniversityToolDialog('labReport', L(noteLang(), 'tools.labReport'), ['Formål og hypotese', 'Materialer og opstilling', 'Metode', 'Data og beregninger', 'Resultat, fejlkilder og konklusion'], 'stem'),
    circuit: () => openUniversityToolDialog('circuit', L(noteLang(), 'tools.circuit'), ['Formål', 'Komponenter og værdier', 'Forsyning og forbindelser', 'Beregning', 'Måling og kontrol'], 'stem'),
    calculator: () => openAcademicCalculator('calculator'),
    checklist: () => insertHtml('<p>☐ </p><p>☐ </p><p><br></p>'),
    hr: () => insertHtml('<hr><p><br></p>'),
    draw: () => { resetDrawing(); $('#drawingDialog').showModal(); },
    model: () => openModelDialog(),
    ...Object.fromEntries(Object.entries(figureToolTemplates).map(([tool, template]) => [tool, () => openModelWithTemplate(template)])),
  };
  if (!actions[name]) return false;
  actions[name]();
  return true;
}

function polynomialValue(coefficients, x) {
  return coefficients.reduce((sum, coefficient) => sum * x + coefficient, 0);
}

function solvePolynomial(coefficients) {
  const values = coefficients.map(Number);
  while (values.length > 2 && Math.abs(values[0]) < 1e-12) values.shift();
  const degree = values.length - 1;
  if (degree === 1) return [-values[1] / values[0]];
  if (degree === 2) {
    const [a, b, c] = values;
    const d = b * b - 4 * a * c;
    if (d >= 0) return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
    return [`${(-b / (2 * a)).toFixed(4)} + ${(Math.sqrt(-d) / (2 * a)).toFixed(4)}i`, `${(-b / (2 * a)).toFixed(4)} - ${(Math.sqrt(-d) / (2 * a)).toFixed(4)}i`];
  }
  const [a, b, c, d] = values;
  const p = (3 * a * c - b * b) / (3 * a * a);
  const q = (27 * a * a * d - 9 * a * b * c + 2 * b ** 3) / (27 * a ** 3);
  const discriminant = (q / 2) ** 2 + (p / 3) ** 3;
  const shift = -b / (3 * a);
  const cbrt = value => Math.sign(value) * Math.abs(value) ** (1 / 3);
  if (discriminant >= 0) {
    const u = cbrt(-q / 2 + Math.sqrt(discriminant));
    const v = cbrt(-q / 2 - Math.sqrt(discriminant));
    const real = u + v + shift;
    const realPart = -(u + v) / 2 + shift;
    const imaginary = Math.sqrt(3) * (u - v) / 2;
    return [real, `${realPart.toFixed(4)} + ${Math.abs(imaginary).toFixed(4)}i`, `${realPart.toFixed(4)} - ${Math.abs(imaginary).toFixed(4)}i`];
  }
  const radius = 2 * Math.sqrt(-p / 3);
  const angle = Math.acos((3 * q / (2 * p)) * Math.sqrt(-3 / p)) / 3;
  return [0, 1, 2].map(k => radius * Math.cos(angle - 2 * Math.PI * k / 3) + shift);
}

function openEquationSolver() {
  if (!requireLogin('Ligningsløseren kræver en profil.')) return;
  let dialog = $('#equationSolverDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'equationSolverDialog';
    dialog.className = 'equation-solver-dialog';
    dialog.innerHTML = `<div class="modal">
      <div class="modal-head"><div><span class="engineering-tag">MATEMATIK</span><h2>Ligningsløser</h2><p class="modal-subtitle">Første, anden og tredje grad.</p></div><button type="button" class="modal-close" data-equation-close>×</button></div>
      <label class="field">Grad<select id="equationDegree"><option value="1">Første grad</option><option value="2" selected>Anden grad</option><option value="3">Tredje grad</option></select></label>
      <div class="coefficient-row"><label>a<input type="number" step="any" id="coefA" value="1"></label><label>b<input type="number" step="any" id="coefB" value="0"></label><label data-coef-c>c<input type="number" step="any" id="coefC" value="-1"></label><label data-coef-d class="hidden">d<input type="number" step="any" id="coefD" value="0"></label></div>
      <div class="equation-preview" id="equationPreview">x² − 1 = 0</div>
      <div class="equation-result" id="equationResult">Tryk Beregn for at finde rødderne.</div>
      <div class="modal-actions"><button type="button" class="btn-outline" data-equation-close>Annuller</button><button type="button" class="btn-outline" id="insertEquationResult">Indsæt i noter</button><button type="button" class="btn-primary" id="solveEquation">Beregn</button></div>
    </div>`;
    document.body.appendChild(dialog);
    const update = () => {
      const degree = Number($('#equationDegree').value);
      $('[data-coef-c]').classList.toggle('hidden', degree < 2);
      $('[data-coef-d]').classList.toggle('hidden', degree < 3);
      const labels = degree === 1 ? ['a', 'b'] : degree === 2 ? ['a', 'b', 'c'] : ['a', 'b', 'c', 'd'];
      const values = [$('#coefA').value, $('#coefB').value, $('#coefC').value, $('#coefD').value].slice(0, degree + 1);
      $('#equationPreview').textContent = values.map((value, index) => {
        const power = degree - index;
        if (power === 0) return `${value}`;
        if (power === 1) return `${value}x`;
        return `${value}x^${power}`;
      }).join(' + ').replace(/\+ -/g, '− ') + ' = 0';
      dialog.dataset.coefficients = JSON.stringify(values);
    };
    dialog.addEventListener('input', update);
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-equation-close]')) dialog.close();
      if (event.target.closest('#solveEquation')) {
        update();
        const roots = solvePolynomial(JSON.parse(dialog.dataset.coefficients));
        $('#equationResult').innerHTML = `<b>Rødder</b><p>${roots.map((root, index) => `x${index + 1} = ${typeof root === 'number' ? Number(root.toFixed(8)) : root}`).join('<br>')}</p>`;
      }
      if (event.target.closest('#insertEquationResult')) {
        const eqHtml = `<section class="stem-block equation-note"><h4>Ligningsløsning</h4><p class="math-line">${escapeHtml($('#equationPreview').textContent)}</p>${$('#equationResult').innerHTML}</section><p><br></p>`;
        dialog.close();
        setTimeout(() => insertHtml(eqHtml), 50);
      }
    });
  }
  $('#equationDegree').value = '2';
  dialog.dispatchEvent(new Event('input'));
  dialog.showModal();
}

function noteLang() {
  return activePage()?.language || appSettings.defaultLanguage || 'da';
}

function updatePdfScanBtn() {
  const btn = $('#scanPdf');
  if (!btn) return;
  const type = $('#pdfOutputType')?.value || 'notes';
  const labels = { notes: 'Generer noter', flashcards: 'Generer flashcards', quiz: 'Generer quiz', quote: 'Find citat', misconceptions: 'Find misforståelser' };
  btn.textContent = labels[type] || 'Generer';
}

function openPdfDialog(outputType = 'notes') {
  if (!requireLogin('PDF til noter kræver en profil. De første 2 behandlinger er gratis.')) return;
  if (!hasPremium() && usageRecord().pdf >= 10) {
    openPremiumDialog();
    return;
  }
  captureEditorRange();
  $('#pdfForm')?.reset();
  pdfSourceMode = 'file';
  document.querySelectorAll('[data-pdf-source]').forEach(btn => btn.classList.toggle('active', btn.dataset.pdfSource === 'file'));
  $('#pdfFileSource')?.classList.remove('hidden');
  $('#pdfTextSource')?.classList.add('hidden');
  if ($('#pdfOutputType')) $('#pdfOutputType').value = ['notes', 'flashcards', 'quiz', 'quote', 'misconceptions'].includes(outputType) ? outputType : 'notes';
  if ($('#pdfClassLevel')) $('#pdfClassLevel').value = activePage()?.classLevel || 'universitet';
  const result = $('#quoteResult');
  if (result) result.className = 'ai-result';
  const status = $('#pdfStatus');
  if (status) status.textContent = 'PDF-filer analyseres side for side og må højst indeholde 8 sider.';
  updatePdfScanBtn();
  $('#pdfDialog')?.showModal();
}

function openMathDialog() {
  captureEditorRange();
  $('#mathInput').value = '';
  $('#mathPreview').innerHTML = '';
  $('#mathDialog').showModal();
}

function insertFlashcardHtml() {
  captureEditorRange();
  insertHtml('<div class="study-card"><strong>Flashcard</strong><b>Spørgsmål:</b> <br><br><b>Svar:</b> </div><p><br></p>');
}

function closeContextToolsMenu() {
  const menu = $('#contextToolsMenu');
  const btn = $('#toggleContextTools');
  if (menu) menu.hidden = true;
  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Værktøjer ▾';
  }
}

function toggleContextToolsMenu() {
  const menu = $('#contextToolsMenu');
  const btn = $('#toggleContextTools');
  if (!menu || !btn) return;
  const open = menu.hidden;
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.textContent = open ? 'Værktøjer ▴' : 'Værktøjer ▾';
}

function closeStudyHelpMenu() {
  const menu = $('#studyHelpMenu');
  const btn = $('#toggleStudyHelp');
  if (menu) menu.hidden = true;
  if (btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '✦ Studiehjælp ▾';
  }
}

function toggleStudyHelpMenu() {
  const menu = $('#studyHelpMenu');
  const btn = $('#toggleStudyHelp');
  if (!menu || !btn) return;
  const open = menu.hidden;
  menu.hidden = !open;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.textContent = open ? '✦ Studiehjælp ▴' : '✦ Studiehjælp ▾';
}

function handleExamCheckToggle(checkbox) {
  examData.checks[checkbox.dataset.examCheck] = checkbox.checked;
  if (checkbox.checked) earnRewardPoints(REWARD_AMOUNTS.planCheck, `plan-check-${checkbox.dataset.examCheck}`);
  saveExamData();
  renderExamPlan();
  renderExamSidebar();
  renderRewardStrip();
}

function toggleToolbarExpand() {
  data.ui.toolbarExpanded = !data.ui.toolbarExpanded;
  persist();
  const panel = $('#toolbarPanel');
  if (!panel) return;
  panel.classList.toggle('expanded', data.ui.toolbarExpanded);
  panel.classList.toggle('compact', !data.ui.toolbarExpanded);
  const btn = $('#toggleToolbar');
  if (btn) btn.textContent = `Alle værktøjer ${data.ui.toolbarExpanded ? '▴' : '▾'}`;
}

const packDescriptions = {
  general: 'Citat, referencer, argument og tidslinje',
  stem: 'Matematik, fysik, kemi, modeller, grafer og laboratorium',
  coding: 'Én kodeeditor med alle sprog, plus robotik og fejlfinding',
  psychology: 'Hjerne, kognition, adfærd og forskningsmetode',
  health: 'Patientcases, anatomi, evidens og klinisk ræsonnering',
  other: 'Tilpassede værktøjer',
};

function openToolPacksDialog() {
  const page = activePage();
  if (!page) return alert('Åbn en note først.');
  const selected = new Set(resolvePageToolPacks(page));
  const allowedPacks = new Set(['general', 'stem', 'coding', 'psychology', 'health']);
  $('#toolPackChoices').innerHTML = Object.entries(toolPacks).filter(([id, pack]) => allowedPacks.has(id) && (pack.tools?.length || pack.groups?.length)).map(([id, pack]) => `
    <label class="tool-pack-card">
      <input type="checkbox" name="toolPack" value="${id}" ${selected.has(id) ? 'checked' : ''}>
      <span class="tool-pack-icon">${pack.icon}</span>
      <span><strong>${escapeHtml(pack.label)}</strong><small>${escapeHtml(studyFields[id]?.description || packDescriptions[id] || pack.label)}</small></span>
    </label>`).join('');
  $('#toolPacksDialog').showModal();
}

const templateFieldExamples = {
  epsilonDelta: [
    'Eksempel: Vis at lim x→2 (3x + 1) = 7, dvs. ∀ε>0 ∃δ>0: |x-2|<δ ⇒ |(3x+1)-7|<ε.',
    'Eksempel: Vælg δ = ε / 3, så |3x+1-7| = 3|x-2| < 3δ = ε.',
    'Eksempel: |x-2| < δ ⇒ |3x-6| = 3|x-2| < 3δ ≤ ε.',
    'Eksempel: Da uligheden holder for alle ε > 0 med dette δ, er grænseværdien bevist.',
  ],
  summation: [
    'Eksempel: Σ_{n=1}^∞ 1/n² – angiv indeksvariabel, startværdi og slutværdi.',
    'Eksempel: Brug kvotientkriteriet: lim |a_{n+1}/a_n| < 1 ⇒ rækken er konvergent.',
    'Eksempel: S_N = Σ_{n=1}^N 1/n² – beregn de første led og find et mønster.',
    'Eksempel: lim_{N→∞} S_N = π²/6.',
    'Eksempel: Rækken konvergerer mod π²/6 (Basel-problemet).',
  ],
  quantumMechanics: [
    'Eksempel: |ψ⟩ = c₁|0⟩ + c₂|1⟩ i et 2-dimensionalt Hilbertrum med |c₁|² + |c₂|² = 1.',
    'Eksempel: Â|φ⟩ = a|φ⟩, hvor a er den målte egenværdi for operatoren Â.',
    'Eksempel: Indsæt Ĥ for systemet og løs iℏ∂|ψ⟩/∂t = Ĥ|ψ⟩ for tidsudviklingen.',
    'Eksempel: ⟨Â⟩ = ⟨ψ|Â|ψ⟩ – beregn forventningsværdien af målingen.',
    'Eksempel: Kontrollér at Δx · Δp ≥ ℏ/2 er opfyldt for den valgte tilstand.',
  ],
  quantumPhysics: [
    'Eksempel: E = hν med h = 6,626·10⁻³⁴ J·s og ν = 5,0·10¹⁴ Hz.',
    'Eksempel: λ = h/p – beregn de Broglie-bølgelængden for en elektron med given hastighed.',
    'Eksempel: |ψ(x)|² angiver sandsynlighedstætheden for at finde partiklen ved x.',
    'Eksempel: Beskriv potentialet V(x) og find de tilladte energiniveauer Eₙ.',
    'Eksempel: Sammenlign med det klassiske grænsetilfælde for store kvantetal.',
  ],
  calculus: [
    'Eksempel: f(x) = x² - 4x + 3 er defineret og kontinuert for alle x ∈ ℝ.',
    'Eksempel: lim x→1 f(x) = f(1) = 0, så f er kontinuert i x = 1.',
    'Eksempel: f′(x) = 2x - 4. Find ekstrema hvor f′(x) = 0.',
    'Eksempel: ∫₀² f(x) dx – beregn arealet under kurven mellem x = 0 og x = 2.',
    'Eksempel: Brug resultatet til at finde minimum, maksimum eller akkumuleret ændring.',
  ],
  linearAlgebra: [
    'Eksempel: V = ℝ³ med standardbasis e₁, e₂, e₃.',
    'Eksempel: T(x,y) = (2x + y, x - y) – beskriv afbildningens egenskaber.',
    'Eksempel: A = [[2,1],[1,3]] repræsenterer T i den givne basis.',
    'Eksempel: Find λ og v, så Av = λv, dvs. løs det(A - λI) = 0.',
    'Eksempel: Angiv egenværdier, egenvektorer og deres fortolkning.',
  ],
  differentialEquations: [
    'Eksempel: y′ + 2y = 6, y(0) = 1.',
    'Eksempel: 1. ordens lineær differentialligning med konstante koefficienter.',
    'Eksempel: Brug integrerende faktor e^{2t} til at løse ligningen.',
    'Eksempel: Undersøg om y(t) → 3 for t → ∞ (stabilt ligevægtspunkt).',
    'Eksempel: Forklar hvad løsningen y(t) = 3 + ce^{-2t} betyder for systemet.',
  ],
  analysis: [
    'Eksempel: En følge (aₙ) konvergerer mod L, hvis der for alle ε > 0 findes N, så |aₙ - L| < ε for n ≥ N.',
    'Eksempel: Antag at f er kontinuert på [a,b], og angiv hvilke sætninger der må anvendes.',
    'Eksempel: Start fra definitionen, brug trekantsuligheden og vælg en grænse, der afhænger af ε.',
    'Eksempel: Lad ε > 0 være givet. Gennemfør hvert trin og begrund den anvendte ulighed.',
    'Eksempel: Resultatet giver entydighed af grænseværdien og det ønskede korollar.',
  ],
  complexAnalysis: [
    'Eksempel: Vis at f(z) = z² er holomorf ved at kontrollere Cauchy-Riemann-ligningerne.',
    'Eksempel: ∮_C f(z) dz langs en simpel lukket kurve C – angiv parametrisering.',
    'Eksempel: f(z) = 1/(z-2) har en pol af orden 1 i z = 2.',
    'Eksempel: Res(f, 2) = lim_{z→2} (z-2)f(z) = 1.',
    'Eksempel: Brug residuesætningen: ∮_C f(z) dz = 2πi · Res(f,2).',
  ],
  probability: [
    'Eksempel: Ω = {1,2,3,4,5,6} for et terningekast.',
    'Eksempel: X = antal point ved et terningekast, X ∈ {1,…,6}.',
    'Eksempel: X ~ Bin(20, 0,35) – angiv parametrene n og p.',
    'Eksempel: E(X) = np = 7, Var(X) = np(1-p) = 4,55.',
    'Eksempel: P(X ≥ 8) ≈ 0,256 – fortolk resultatet i konteksten.',
  ],
  numericalMethods: [
    'Eksempel: Find roden til f(x) = x³ - x - 2 = 0 numerisk.',
    'Eksempel: Brug Newtons metode: x_{n+1} = x_n - f(x_n)/f′(x_n).',
    'Eksempel: Estimer fejlen |x_{n+1} - x_n| og kontrollér konvergensordenen.',
    'Eksempel: Undersøg om metoden konvergerer for det valgte startgæt.',
    'Eksempel: x ≈ 1,5214 efter 5 iterationer med fejl < 10⁻⁶.',
  ],
  optimization: [
    'Eksempel: Maksimér f(x,y) = 4x + 3y.',
    'Eksempel: x + y ≤ 10, x ≥ 0, y ≥ 0.',
    'Eksempel: ∇f = λ∇g (Lagrange) eller hjørnepunkter for et LP-problem.',
    'Eksempel: Brug Lagranges multiplikatormetode eller simplexmetoden.',
    'Eksempel: Optimum ved (x,y) = (10,0) med værdi 40. Undersøg ændringer i begrænsningerne.',
  ],
  geometry: [
    'Eksempel: En cirkel med centrum (2,3) og radius 5 i ℝ².',
    'Eksempel: Punktet P = (x,y) eller (x,y,z) i et koordinatsystem.',
    'Eksempel: Rotation, translation eller skalering af figuren.',
    'Eksempel: Areal, vinkler eller afstande, der bevares under transformationen.',
    'Eksempel: Den transformerede figur har samme areal, men ny placering.',
  ],
  topology: [
    'Eksempel: (X, τ) er et topologisk rum, f.eks. ℝ med standardtopologien.',
    'Eksempel: U = (a,b) er åben, [a,b] er lukket i ℝ.',
    'Eksempel: f: X→Y er kontinuert, hvis f⁻¹(U) er åben for alle åbne U⊆Y.',
    'Eksempel: [a,b] er kompakt og sammenhængende i ℝ.',
    'Eksempel: Vis påstanden ved at anvende definitionen direkte på det givne rum.',
  ],
  discreteMath: [
    'Eksempel: A = {1,2,3}, R = {(x,y) : x ≤ y} er en relation på A.',
    'Eksempel: Antal måder at vælge 3 ud af 10 elementer: C(10,3) = 120.',
    'Eksempel: En graf G med 5 knuder og 6 kanter – angiv adjacensmatrix.',
    'Eksempel: aₙ = aₙ₋₁ + aₙ₋₂, a₀ = 0, a₁ = 1 (Fibonacci).',
    'Eksempel: Brug induktion: vis for n = 1, antag for n = k, vis for n = k+1.',
  ],
  numberTheory: [
    'Eksempel: 17 ≡ 2 (mod 5).',
    'Eksempel: 84 = 2² · 3 · 7.',
    'Eksempel: Find heltalsløsninger til 3x + 5y = 1.',
    'Eksempel: Brug Euklids algoritme til at finde gcd(84, 30).',
    'Eksempel: Vis at påstanden gælder for alle heltal ved et modulo-argument.',
  ],
  logic: [
    'Eksempel: For alle n ∈ ℕ er n² + n et lige tal.',
    'Eksempel: ∀n ∈ ℕ: n² + n = n(n+1).',
    'Eksempel: Direkte bevis, modstrid eller induktion.',
    'Eksempel: n(n+1) er produktet af to på hinanden følgende tal, hvoraf et er lige.',
    'Eksempel: Angiv et eksempel, der viser hvorfor en svagere påstand ikke holder.',
  ],
  sourceAnalysis: [
    'Eksempel: Kilden er skrevet af [navn] i [år] i forbindelse med [begivenhed].',
    'Eksempel: Kilden er skrevet for at [overbevise/informere] [målgruppe].',
    'Eksempel: Vurder om kilden er objektiv, et partsindlæg eller propaganda.',
    'Eksempel: »…citat fra kilden…« – forklar hvad det viser.',
    'Eksempel: Kilden er [meget/delvist] troværdig, fordi…',
  ],
  argument: [
    'Eksempel: Skolen bør indføre mobilforbud i timerne.',
    'Eksempel: Undersøgelser viser, at mobiler forstyrrer koncentrationen.',
    'Eksempel: Koncentration er afgørende for læring (almen pædagogisk princip).',
    'Eksempel: Mobiler kan også bruges som læringsredskab.',
    'Eksempel: Samlet vægter argumenterne for et forbud i undervisningstiden.',
  ],
  timeline: [
    'Eksempel: 1989.',
    'Eksempel: Berlinmurens fald.',
    'Eksempel: Markerede afslutningen på den kolde krig i Europa.',
    'Eksempel: Forbind med tidligere og senere begivenheder i forløbet.',
  ],
  closeReading: [
    'Eksempel: Citer det relevante tekststed med linje- eller sidehenvisning.',
    'Eksempel: Identificer metaforer, gentagelser, synsvinkel eller stil.',
    'Eksempel: Forklar hvilken effekt virkemidlet har på tema eller betydning.',
    'Eksempel: Henvis til side, kapitel eller udgave for tekststedet.',
  ],
  bibliography: [
    'Eksempel: Hansen, A.',
    'Eksempel: Titel på bogen eller artiklen.',
    'Eksempel: 2025.',
    'Eksempel: Forlaget eller tidsskriftets navn.',
    'Eksempel: https://doi.org/xx.xxxx eller URL til kilden.',
  ],
  swot: [
    'Eksempel: Stærkt brand og loyale kunder.',
    'Eksempel: Høje produktionsomkostninger.',
    'Eksempel: Nye markeder eller teknologier.',
    'Eksempel: Stigende konkurrence eller ændrede regler.',
  ],
  accounting: [
    'Eksempel: Omsætning på 5.000.000 kr. i regnskabsåret.',
    'Eksempel: Variable og faste omkostninger på i alt 3.800.000 kr.',
    'Eksempel: Resultat før skat = omsætning - omkostninger = 1.200.000 kr.',
    'Eksempel: Aktiver i alt 10.000.000 kr., heraf egenkapital 4.000.000 kr.',
    'Eksempel: Beregn overskudsgrad og soliditetsgrad, og fortolk udviklingen.',
  ],
  demandSupply: [
    'Eksempel: Markedet for el-cykler.',
    'Eksempel: Pris, indkomst og priser på substitutter påvirker efterspørgslen.',
    'Eksempel: Produktionsomkostninger og antal producenter påvirker udbuddet.',
    'Eksempel: Find ligevægtspris og -mængde, hvor Qd = Qs.',
    'Eksempel: Forklar hvordan et skift i kurverne påvirker pris og mængde.',
  ],
  vocabulary: [
    'Eksempel: »to negotiate«.',
    'Eksempel: At forhandle eller diskutere for at nå et resultat.',
    'Eksempel: negotiate – negotiated – negotiated.',
    'Eksempel: »They negotiated a new contract.«',
    'Eksempel: forhandle / at forhandle.',
  ],
  translation: [
    'Eksempel: Indsæt sætningen eller afsnittet på originalsproget.',
    'Eksempel: Skriv din oversættelse til målsproget.',
    'Eksempel: Forklar hvorfor du valgte et bestemt ord eller udtryk.',
    'Eksempel: Angiv andre mulige oversættelser og deres nuanceforskel.',
  ],
  grammar: [
    'Eksempel: »She has been working here for two years.«',
    'Eksempel: »working« er et verbum (present participle).',
    'Eksempel: Sætningen står i present perfect continuous.',
    'Eksempel: has been working – nutid, datid, førnutid osv.',
    'Eksempel: Forklar hvorfor denne tid/form bruges i sætningen.',
  ],
  caseStudy: [
    'Eksempel: Virksomheden X står over for faldende salg i [marked].',
    'Eksempel: Hvorfor falder virksomhedens markedsandel?',
    'Eksempel: Anvend relevant teori, f.eks. Porters Five Forces.',
    'Eksempel: Brug data fra årsrapport, interviews eller branchestatistik.',
    'Eksempel: Sammenhold teori og data for at identificere årsager.',
    'Eksempel: Anbefal konkrete handlinger baseret på analysen.',
  ],
  interview: [
    'Eksempel: Hvordan oplever unge brugen af sociale medier i dagligdagen?',
    'Eksempel: Tak for din deltagelse. Interviewet tager ca. 30 minutter og er anonymt.',
    'Eksempel: Kan du beskrive en typisk dag med dine sociale medier?',
    'Eksempel: Kan du give et konkret eksempel på det?',
    'Eksempel: Informeret samtykke, anonymisering og opbevaring af data.',
  ],
  survey: [
    'Eksempel: Undersøge tilfredshed med en ny app blandt brugerne.',
    'Eksempel: Studerende på 18-25 år, der har brugt appen i 3 måneder.',
    'Eksempel: Tilfredshed, brugsfrekvens og alder.',
    'Eksempel: Hvor tilfreds er du med appens funktioner?',
    'Eksempel: 1 (meget utilfreds) til 5 (meget tilfreds).',
  ],
  patientCase: [
    'Eksempel: 68-årig mand med hypertension og diabetes type 2 i 10 år.',
    'Eksempel: BT 165/95, puls 88, let åndenød ved anstrengelse.',
    'Eksempel: Risiko for kardiovaskulær komplikation pga. ukontrolleret blodtryk.',
    'Eksempel: Justering af medicin og henvisning til diætist.',
    'Eksempel: Opfølgning efter 4 uger med ny BT-måling.',
  ],
  anatomy: [
    'Eksempel: Hjertet.',
    'Eksempel: I mediastinum mellem lungerne, bag brystbenet.',
    'Eksempel: Pumper blod til lungerne og resten af kroppen.',
    'Eksempel: Forbundet til lungerne via lungekredsløbet og til kroppen via det systemiske kredsløb.',
    'Eksempel: Skader på strukturen kan give f.eks. hjertesvigt eller arytmi.',
  ],
  dosage: [
    'Eksempel: Paracetamol.',
    'Eksempel: 500 mg/tablet.',
    'Eksempel: 1 g hver 6. time ved behov, maks. 4 g/døgn.',
    'Eksempel: Antal tabletter = ordineret dosis ÷ styrke pr. tablet.',
    'Eksempel: Kontrollér mod patientens vægt, alder og maksimale døgndosis.',
  ],
  evidence: [
    'Eksempel: Reducerer intervention X risikoen for Y?',
    'Eksempel: Randomiseret kontrolleret studie (RCT) eller kohortestudie.',
    'Eksempel: 500 deltagere, 18-65 år, med diagnosen Z.',
    'Eksempel: Relativ risiko = 0,75 (95% CI: 0,6-0,9).',
    'Eksempel: Vurder selektionsbias, confounding og frafald.',
    'Eksempel: Kan resultatet overføres til din kliniske kontekst?',
  ],
  legislation: [
    'Eksempel: Straffeloven.',
    'Eksempel: § 276 (tyveri).',
    'Eksempel: Tilegnelse af en andens gode med forsæt til at skaffe sig uberettiget vinding.',
    'Eksempel: Bøde eller fængsel indtil 1 år og 6 måneder.',
    'Eksempel: Vurder om betingelserne i bestemmelsen er opfyldt i den konkrete sag.',
  ],
  caseLaw: [
    'Eksempel: Beskriv hændelsesforløbet kort og objektivt.',
    'Eksempel: Var betingelserne for ansvar opfyldt i den konkrete sag?',
    'Eksempel: Sagsøgers og sagsøgtes hovedargumenter.',
    'Eksempel: Rettens vurdering af beviser og retsregler.',
    'Eksempel: Domsresultatet, f.eks. frifindelse eller dom til betaling.',
    'Eksempel: Hvordan kan dommen anvendes i fremtidige, lignende sager?',
  ],
  legalMethod: [
    'Eksempel: Har A ret til at hæve købet pga. mangler ved varen?',
    'Eksempel: Købeloven § 78 og relevant retspraksis.',
    'Eksempel: Fortolk bestemmelsens ordlyd, formål og forarbejder.',
    'Eksempel: Vurder om manglen er væsentlig nok til ophævelse i den konkrete sag.',
    'Eksempel: A har/har ikke ret til at hæve købet.',
  ],
  discourse: [
    'Eksempel: Politisk tale, avisartikel eller debatindlæg om [emne].',
    'Eksempel: Identificer nøglebegreber og hvordan de bruges.',
    'Eksempel: Hvilke positioner/aktører optræder, og hvordan fremstilles de?',
    'Eksempel: Hvem har definitionsmagten, og i hvilken samfundsmæssig kontekst?',
    'Eksempel: Hvad siger diskursen om magtforhold og virkelighedsopfattelse?',
  ],
  hermeneutics: [
    'Eksempel: Beskriv din egen forforståelse af emnet før analysen.',
    'Eksempel: Hvordan ændrer enkeltdele forståelsen af helheden – og omvendt?',
    'Eksempel: Den hermeneutiske cirkel fører til en ny, dybere forståelse.',
    'Eksempel: Henvis til konkrete tekststeder, der understøtter fortolkningen.',
    'Eksempel: Hvordan har analysen ændret din oprindelige forforståelse?',
  ],
  theoryCompare: [
    'Eksempel: Beskriv hovedpointerne i den første teori.',
    'Eksempel: Beskriv hovedpointerne i den anden teori.',
    'Eksempel: Begge teorier fokuserer på…',
    'Eksempel: De to teorier er uenige om…',
    'Eksempel: Hvilken teori forklarer bedst det konkrete eksempel, og hvorfor?',
  ],
  qualitativeCoding: [
    'Eksempel: »…citat fra interview eller observation…«',
    'Eksempel: Kortfattet kode der beskriver datastykket, f.eks. »tidspres«.',
    'Eksempel: Gruppér koder i en overordnet kategori, f.eks. »arbejdsmiljø«.',
    'Eksempel: Saml kategorier i et overordnet tema for analysen.',
    'Eksempel: Noter dine tanker om mønstre og mulige fortolkninger.',
  ],
  researchDesign: [
    'Eksempel: Hvordan påvirker [X] [Y] blandt [målgruppe]?',
    'Eksempel: Kvalitativt casestudie, kvantitativt spørgeskema eller mixed methods.',
    'Eksempel: Interviews, surveydata eller eksisterende statistik.',
    'Eksempel: Tematisk analyse eller statistisk test (f.eks. t-test).',
    'Eksempel: Overvej reliabilitet, validitet, samtykke og anonymitet.',
  ],
  literatureReview: [
    'Eksempel: Søgeord og databaser brugt til litteratursøgningen.',
    'Eksempel: Inklusions- og eksklusionskriterier for de fundne studier.',
    'Eksempel: Gennemgående temaer i litteraturen.',
    'Eksempel: Hvor er forskerne uenige, og hvorfor?',
    'Eksempel: Hvad er endnu ikke undersøgt, og hvorfor er det relevant?',
  ],
  econometrics: [
    'Eksempel: Y = β₀ + β₁X₁ + β₂X₂ + ε.',
    'Eksempel: Y = løn, X₁ = uddannelse, X₂ = erfaring.',
    'Eksempel: Linearitet, ingen autokorrelation, homoskedasticitet.',
    'Eksempel: Estimer β-værdier med OLS og angiv konfidensintervaller.',
    'Eksempel: Test for heteroskedasticitet og fortolk koefficienternes betydning.',
  ],
  finance: [
    'Eksempel: Forventede pengestrømme: 100.000 kr./år i 5 år.',
    'Eksempel: Diskonteringsrente på 6% p.a.',
    'Eksempel: NPV = Σ CFₜ / (1+r)^t - investering.',
    'Eksempel: Vurder følsomhed for ændringer i rente og pengestrømme.',
    'Eksempel: Accepter projektet, hvis NPV > 0.',
  ],
  clinicalReasoning: [
    'Eksempel: Patienten har feber, hoste og åndenød i 3 dage.',
    'Eksempel: Mulige forklaringer kunne være pneumoni eller bronkitis.',
    'Eksempel: Pneumoni, bronkitis, COVID-19, lungeemboli.',
    'Eksempel: Røntgen af thorax, blodprøver og CRP.',
    'Eksempel: Opstart behandling og plan for opfølgning.',
  ],
  epidemiology: [
    'Eksempel: 10.000 voksne i en kommune.',
    'Eksempel: Rygning.',
    'Eksempel: Udvikling af lungekræft.',
    'Eksempel: Relativ risiko eller odds ratio.',
    'Eksempel: Overvej confounding fra alder og alkoholforbrug.',
  ],
  legalIssue: [
    'Eksempel: Beskriv den konkrete situation kort og objektivt.',
    'Eksempel: Har parten ret til…?',
    'Eksempel: Angiv den relevante lovbestemmelse eller retsregel.',
    'Eksempel: Anvend reglen på de konkrete fakta i sagen.',
    'Eksempel: Parten har/har ikke ret til…',
  ],
  integral: [
    'Eksempel: f(x) = 3x² + 2x',
    'Eksempel: ∫₀² f(x) dx',
    'Eksempel: F(x) = x³ + x²',
    'Eksempel: F(2) − F(0) = 12 − 0 = 12',
    'Eksempel: Integralet giver arealet under kurven mellem x=0 og x=2.',
  ],
  derivative: [
    'Eksempel: f(x) = x³ − 4x',
    'Eksempel: Find f′(2)',
    'Eksempel: Potensreglen: f′(x) = 3x² − 4',
    'Eksempel: f′(2) = 12 − 4 = 8',
    'Eksempel: Kurven stiger med hældning 8 i x=2.',
  ],
  mechanics: [
    'Eksempel: Blok på hældning 30° uden friktion, m = 5 kg.',
    'Eksempel: Tegn tyngde, normalkraft og komponent langs hældningen.',
    'Eksempel: F = m · g · sin(30°) = 5 · 9,81 · 0,5',
    'Eksempel: F ≈ 24,5 N',
    'Eksempel: Blokken accelererer ned ad hældningen med ca. 4,9 m/s².',
  ],
  angles: [
    'Eksempel: Trekant ABC med vinkel A = 40° og vinkel B = 60°.',
    'Eksempel: Vinkel C = 180° − 40° − 60° = 80°.',
    'Eksempel: Vinkelsummen i en trekant er 180°.',
    'Eksempel: C = 80°',
    'Eksempel: Alle tre vinkler summer til 180° — opgaven er konsistent.',
  ],
  labReport: [
    'Eksempel: Undersøge sammenhængen mellem koncentration og absorbans.',
    'Eksempel: Spektrofotometer, kuvetter, standardopløsninger.',
    'Eksempel: Mål absorbans ved 5 koncentrationer, 3 gentagelser.',
    'Eksempel: Absorbans stiger lineært med koncentration (R² = 0,98).',
    'Eksempel: Resultatet støtter Beer-Lamberts lov; fejlkilde: kuvette-rester.',
  ],
  circuit: [
    'Eksempel: Beregn strøm gennem en seriekoblet modstand og LED.',
    'Eksempel: R = 220 Ω, LED Vf = 2,0 V, forsyning 5 V.',
    'Eksempel: Seriekobling: R + LED i loop.',
    'Eksempel: I = (5 − 2) / 220 ≈ 13,6 mA',
    'Eksempel: Strømmen er inden for LED-specifikationen.',
  ],
  siUnits: [
    'Eksempel: Hastighed 72 km/t',
    'Eksempel: 72 km/t = 72 · 1000/3600 m/s',
    'Eksempel: SI-enhed m/s',
    'Eksempel: 72 km/t = 20 m/s',
    'Eksempel: 20 m/s · 3,6 = 72 km/t — kontrol OK.',
  ],
  python: [
    'Eksempel: Find det største tal i en liste uden indbygget max().',
    'Eksempel: Input: [4, 1, 7, 3] → output: 7',
    'Eksempel: Gennemløb listen og hold styr på største værdi.',
    'Eksempel: def max_value(lst): ... return largest',
    'Eksempel: Test tom liste, ét element og negative tal — O(n).',
  ],
  javascript: [
    'Eksempel: Valider e-mailformat i et tilmeldingsformular.',
    'Eksempel: Input: brugerens e-mail-streng → output: true/false',
    'Eksempel: Regex + trim + edge cases (tom streng).',
    'Eksempel: function isValidEmail(s) { ... }',
    'Eksempel: Test gyldige, ugyldige og tomme inputs.',
  ],
  debug: [
    'Eksempel: Funktionen returnerer NaN for negative input.',
    'Eksempel: return Math.sqrt(x) uden tjek for x < 0',
    'Eksempel: Math.sqrt modtager negativ værdi.',
    'Eksempel: if (x < 0) return null; return Math.sqrt(x);',
    'Eksempel: Guard clause forhindrer NaN og giver tydeligt output.',
  ],
  physics: [
    'Eksempel: Bold kastes opad med v₀ = 15 m/s, g = 9,81 m/s².',
    'Eksempel: v = v₀ − gt, maks højde når v = 0.',
    'Eksempel: t = v₀/g ≈ 1,53 s, h = v₀²/(2g) ≈ 11,5 m',
    'Eksempel: Maksimal højde ≈ 11,5 m',
    'Eksempel: Resultatet er realistisk for et kast opad.',
  ],
};

const categoryFieldExamples = {
  general: [
    'Eksempel: Beskriv kort, hvad opgaven eller værktøjet skal bruges til.',
    'Eksempel: Angiv kilde, materiale eller data, som arbejdet bygger på.',
    'Eksempel: Gennemfør selve arbejdet – beregning, analyse eller besvarelse.',
    'Eksempel: Henvis til side, afsnit eller datasæt, så det kan efterprøves.',
    'Eksempel: Saml resultatet og din vurdering i en kort konklusion.',
  ],
  stem: [
    'Eksempel: m = 2,0 kg, a = 3,5 m/s² – angiv hvad opgaven spørger om.',
    'Eksempel: Newtons 2. lov: F = m · a.',
    'Eksempel: F = 2,0 · 3,5 = 7,0 N.',
    'Eksempel: Kontrollér enheder (N = kg·m/s²) og om størrelsesordenen giver mening.',
    'Eksempel: Forklar hvad resultatet betyder i sammenhængen.',
  ],
  coding: [
    'Eksempel: Funktionen skal finde det største tal i en liste.',
    'Eksempel: Input [4, 1, 7] → output 7.',
    'Eksempel: def max_value(lst): return max(lst)',
    'Eksempel: Test med tom liste, ét element og negative tal.',
    'Eksempel: Tidskompleksitet O(n) og håndtering af ugyldigt input.',
  ],
  humanities: [
    'Eksempel: Romanen [titel] af [forfatter], udgivet i [år].',
    'Eksempel: Anvend begreber som fortæller, synsvinkel eller komposition.',
    'Eksempel: Citer et konkret tekststed og analysér virkemidlerne.',
    'Eksempel: Overvej en alternativ læsning af samme tekststed.',
    'Eksempel: Sammenfat analysen, og angiv sidetal/udgave for citater.',
  ],
  economics: [
    'Eksempel: Skal virksomheden investere i en ny maskine til 500.000 kr.?',
    'Eksempel: Forventet besparelse 120.000 kr./år i 5 år, rente 5%.',
    'Eksempel: Beregn NPV eller break-even for investeringen.',
    'Eksempel: Hvordan ændres resultatet, hvis renten stiger til 7%?',
    'Eksempel: Anbefal om investeringen bør gennemføres.',
  ],
  languages: [
    'Eksempel: »It\'s raining cats and dogs.«',
    'Eksempel: Idiom – et fast udtryk, der ikke skal tages bogstaveligt.',
    'Eksempel: Betyder at det regner meget kraftigt.',
    'Eksempel: »It\'s raining cats and dogs, so take an umbrella.«',
    'Eksempel: Skriv en sætning, hvor du selv bruger udtrykket.',
  ],
  social: [
    'Eksempel: Hvordan påvirker sociale medier unges selvværd?',
    'Eksempel: Brug f.eks. teori om identitet, og operationalisér som selvvurderet selvtillid.',
    'Eksempel: Spørgeskema blandt 100 unge i alderen 15-18 år.',
    'Eksempel: Sammenhold data med teorien, og find mønstre.',
    'Eksempel: Diskutér undersøgelsens styrker, svagheder og hovedkonklusion.',
  ],
  health: [
    'Eksempel: Patienten har BT 150/95 og angiver hovedpine.',
    'Eksempel: Forhøjet blodtryk kan øge risikoen for hjerte-kar-sygdom.',
    'Eksempel: Vurder om værdierne kræver akut handling eller opfølgning.',
    'Eksempel: Informér patienten, dokumentér og dobbeltkontrollér målingen.',
    'Eksempel: Følg op, og vurder om indsatsen har haft den ønskede effekt.',
  ],
  law: [
    'Eksempel: A har solgt en bil til B, som viser sig at have en skjult fejl.',
    'Eksempel: Købeloven og relevant retspraksis om mangler.',
    'Eksempel: Fortolk hvad der forstås ved en »væsentlig mangel«.',
    'Eksempel: Anvend reglen på de konkrete fakta i sagen mellem A og B.',
    'Eksempel: B har/har ikke ret til at hæve købet eller kræve afslag.',
  ],
  music: [
    'Eksempel: Takt 1-8 i [værk] af [komponist].',
    'Eksempel: 4/4-takt, C-dur, periodisk form.',
    'Eksempel: Akkordforløb I-IV-V-I, synkoperet rytme i takt 3.',
    'Eksempel: Skaber spænding og opløsning, der understøtter temaet.',
    'Eksempel: Øv det svære taktslag i langsomt tempo, før du sætter tempoet op.',
  ],
};

function universityToolStarter(title, section, index, packId, tool) {
  const specific = toolFieldPlaceholders[tool]?.[index];
  if (specific) return specific;
  const fromTemplate = templateFieldExamples[tool];
  if (fromTemplate && fromTemplate[index] != null) {
    const text = fromTemplate[index].replace(/^Eksempel:\s*/i, '').replace(/^»|«$/g, '').trim();
    const short = text.length > 52 ? `${text.slice(0, 49)}…` : text;
    return short.startsWith('Fx ') ? short : `Fx ${short}`;
  }
  const fromCategory = categoryFieldPlaceholders[packId] || categoryFieldExamples.general;
  if (fromCategory && fromCategory[index] != null) {
    const text = fromCategory[index].replace(/^Eksempel:\s*/i, '').trim();
    const short = text.length > 52 ? `${text.slice(0, 49)}…` : text;
    return short.startsWith('Fx ') ? short : `Fx ${short}`;
  }
  return `Fx ${section.toLowerCase()}`;
}

const toolFieldPlaceholders = {
  complexAnalysis: ['Fx f(z)=z² er holomorf', 'Fx ∮_C f(z)dz langs enhedscirklen', 'Fx pol i z=2 med orden 1', 'Fx Res(f,2)=1', 'Fx brug residuesætningen'],
  epsilonDelta: ['Fx lim_{x→2}(3x+1)=7', 'Fx vælg δ=ε/3', 'Fx |3x+6|<3δ≤ε', 'Fx grænseværdien er bevist'],
  calculus: ['Fx f(x)=x²−4x+3', 'Fx lim_{x→1} f(x)=0', 'Fx f′(x)=2x−4', 'Fx ∫₀² f(x)dx', 'Fx find ekstrema'],
  linearAlgebra: ['Fx V=ℝ³', 'Fx T(x,y)=(2x+y, x−y)', 'Fx A=[[2,1],[1,3]]', 'Fx find λ og v', 'Fx fortolk egenvektorer'],
  algebra: ['Fx 2x+5=13', 'Fx x²−5x+6=0', 'Fx faktorisér udtrykket', 'Fx kontrollér løsningen'],
  probability: ['Fx Ω={1,…,6} terning', 'Fx X∈{1,…,6}', 'Fx X~Bin(20,0,35)', 'Fx E(X)=7', 'Fx P(X≥8)'],
  sourceAnalysis: ['Fx forfatter og årstal', 'Fx formål og målgruppe', 'Fx tendens og troværdighed', 'Fx »citat…«', 'Fx vurder kilden'],
  argument: ['Fx påstand: mobilforbud i timer', 'Fx belæg fra undersøgelse', 'Fx almen præmis', 'Fx modargument', 'Fx konklusion'],
  bibliography: ['Fx Hansen, A.', 'Fx Titel på værk', 'Fx 2025', 'Fx forlag', 'Fx DOI eller URL'],
  vocabulary: ['Fx »to negotiate«', 'Fx at forhandle', 'Fx negotiate – negotiated', 'Fx eksempelsætning', 'Fx oversættelse'],
  grammar: ['Fx She has been working…', 'Fx verbum: working', 'Fx present perfect continuous', 'Fx bøjning', 'Fx forklaring'],
  patientCase: ['Fx anamnese', 'Fx observationer', 'Fx problem', 'Fx intervention', 'Fx evaluering'],
  legislation: ['Fx Straffeloven', 'Fx § 276', 'Fx objektiv beskrivelse', 'Fx sanktion', 'Fx anvendelse'],
  swot: ['Fx stærkt brand', 'Fx høje omkostninger', 'Fx nye markeder', 'Fx stigende konkurrence'],
  timeline: ['Fx 1989', 'Fx Berlinmurens fald', 'Fx betydning for Europa', 'Fx sammenhæng i forløbet'],
  closeReading: ['Fx citat med sidehenvisning', 'Fx metafor eller gentagelse', 'Fx effekt på tema', 'Fx dokumentation'],
  caseStudy: ['Fx virksomhed X i marked Y', 'Fx hvorfor falder salget?', 'Fx Porters Five Forces', 'Fx data fra rapport', 'Fx analyse', 'Fx anbefaling'],
  translation: ['Fx originalsætning', 'Fx din oversættelse', 'Fx ordvalg og nuance', 'Fx alternativer'],
  interview: ['Fx forskningsspørgsmål', 'Fx indledning og samtykke', 'Fx hovedspørgsmål', 'Fx opfølgning', 'Fx etik'],
  survey: ['Fx formål med undersøgelsen', 'Fx målgruppe', 'Fx variable', 'Fx spørgsmål', 'Fx skala 1–5'],
  accounting: ['Fx omsætning 5 mio.', 'Fx omkostninger 3,8 mio.', 'Fx resultat før skat', 'Fx balance', 'Fx nøgletal'],
  demandSupply: ['Fx marked for el-cykler', 'Fx efterspørgselsfaktorer', 'Fx udbudsfaktorer', 'Fx ligevægt Qd=Qs', 'Fx konsekvens'],
  legalMethod: ['Fx A vil hæve køb', 'Fx Købeloven § 78', 'Fx fortolkning', 'Fx anvendelse', 'Fx konklusion'],
  discourse: ['Fx politisk tale om emne', 'Fx nøglebegreber', 'Fx positioner', 'Fx magt og kontekst', 'Fx fortolkning'],
  researchDesign: ['Fx forskningsspørgsmål', 'Fx kvalitativ/kvantitativ', 'Fx dataindsamling', 'Fx analysemetode', 'Fx validitet'],
  literatureReview: ['Fx søgeord og databaser', 'Fx inklusionskriterier', 'Fx temaer', 'Fx uenigheder', 'Fx forskningshul'],
  econometrics: ['Fx Y=β₀+β₁X₁+ε', 'Fx variable og betydning', 'Fx antagelser', 'Fx OLS-estimation', 'Fx fortolkning'],
  finance: ['Fx pengestrømme 5 år', 'Fx diskonteringsrente 6%', 'Fx NPV-beregning', 'Fx risiko', 'Fx beslutning'],
  clinicalReasoning: ['Fx feber og hoste 3 dage', 'Fx hypoteser', 'Fx differentialdiagnoser', 'Fx undersøgelser', 'Fx plan'],
  epidemiology: ['Fx population 10.000', 'Fx eksponering', 'Fx outcome', 'Fx relativ risiko', 'Fx confounding'],
  legalIssue: ['Fx faktum i sagen', 'Fx retligt spørgsmål', 'Fx relevant regel', 'Fx anvendelse', 'Fx konklusion'],
  quantumMechanics: ['Fx |ψ⟩=c₁|0⟩+c₂|1⟩', 'Fx Â|φ⟩=a|φ⟩', 'Fx iℏ∂|ψ⟩/∂t=Ĥ|ψ⟩', 'Fx ⟨Â⟩=⟨ψ|Â|ψ⟩', 'Fx ΔxΔp≥ℏ/2'],
  quantumPhysics: ['Fx E=hν', 'Fx λ=h/p', 'Fx |ψ(x)|²', 'Fx V(x) og Eₙ', 'Fx klassisk grænse'],
  numericalMethods: ['Fx find rod til x³−x−2=0', 'Fx Newtons metode', 'Fx fejlestimat', 'Fx konvergens', 'Fx x≈1,5214'],
  optimization: ['Fx max 4x+3y', 'Fx x+y≤10, x,y≥0', 'Fx KKT-betingelser', 'Fx simplex/Lagrange', 'Fx optimum (10,0)'],
  geometry: ['Fx cirkel centrum (2,3), r=5', 'Fx punkt P=(x,y)', 'Fx rotation/translation', 'Fx bevarede størrelser', 'Fx resultat'],
  topology: ['Fx (X,τ) topologisk rum', 'Fx åbne/lukkede mængder', 'Fx kontinuitet', 'Fx kompakthed', 'Fx bevis'],
  discreteMath: ['Fx A={1,2,3}, relation R', 'Fx C(10,3)=120', 'Fx graf med 5 knuder', 'Fx Fibonacci', 'Fx induktion'],
  numberTheory: ['Fx 17≡2 (mod 5)', 'Fx 84=2²·3·7', 'Fx 3x+5y=1', 'Fx gcd(84,30)', 'Fx modulo-argument'],
  logic: ['Fx ∀n∈ℕ: n²+n er lige', 'Fx n(n+1)', 'Fx direkte bevis', 'Fx n(n+1) er lige', 'Fx mod-eksempel'],
  differentialEquations: ['Fx y′+2y=6, y(0)=1', 'Fx 1. ordens lineær', 'Fx integrerende faktor', 'Fx stabilitet t→∞', 'Fx fortolkning'],
  analysis: ['Fx følge konvergerer mod L', 'Fx f kontinuert på [a,b]', 'Fx start fra definitionen', 'Fx ε-N-argument', 'Fx konklusion'],
  hermeneutics: ['Fx forforståelse', 'Fx del og helhed', 'Fx fortolkning', 'Fx teksthenvisning', 'Fx refleksion'],
  theoryCompare: ['Fx teori A', 'Fx teori B', 'Fx ligheder', 'Fx forskelle', 'Fx anvendelighed'],
  qualitativeCoding: ['Fx »citat…«', 'Fx åben kode', 'Fx kategori', 'Fx tema', 'Fx analytisk memo'],
  evidence: ['Fx reducerer X risiko for Y?', 'Fx RCT-design', 'Fx population', 'Fx RR=0,75', 'Fx bias', 'Fx anvendelighed'],
  anatomy: ['Fx hjertet', 'Fx placering i mediastinum', 'Fx funktion', 'Fx relationer', 'Fx klinisk betydning'],
  dosage: ['Fx paracetamol 500 mg', 'Fx styrke pr. tablet', 'Fx 1 g hver 6. time', 'Fx beregning', 'Fx kontrol'],
  caseLaw: ['Fx faktum', 'Fx juridisk spørgsmål', 'Fx parternes argumenter', 'Fx begrundelse', 'Fx resultat', 'Fx præjudikat'],
  precedent: ['Fx tidligere dom', 'Fx retsprincip', 'Fx lighed med nuværende sag', 'Fx anvendelse', 'Fx konklusion'],
  contract: ['Fx kontraktparter', 'Fx aftaleindhold', 'Fx betingelser', 'Fx misligholdelse', 'Fx konsekvens'],
  euLaw: ['Fx EU-forordning/direktiv', 'Fx dansk implementering', 'Fx primær/sekundær ret', 'Fx anvendelse', 'Fx konklusion'],
  humanRights: ['Fx EMRK artikel', 'Fx rettighed og indskrænkning', 'Fx proportionalitet', 'Fx praksis', 'Fx vurdering'],
  legalCitation: ['Fx lovhenvisning', 'Fx domshenvisning', 'Fx litteratur', 'Fx korrekt format', 'Fx komplet reference'],
  caseComparison: ['Fx dom A', 'Fx dom B', 'Fx ligheder', 'Fx forskelle', 'Fx læring'],
  notation: ['Fx takt 1–8 i værk', 'Fx 4/4-takt C-dur', 'Fx akkordforløb', 'Fx rytmisk mønster', 'Fx øveforslag'],
  harmony: ['Fx toneart og akkorder', 'Fx progression I–IV–V–I', 'Fx stemmeføring', 'Fx kadence', 'Fx analyse'],
  rhythm: ['Fx taktart og tempo', 'Fx synkoper', 'Fx rytmisk figur', 'Fx gentagelse', 'Fx øvelse'],
  songAnalysis: ['Fx værk og komponist', 'Fx form og struktur', 'Fx temaer', 'Fx virkemidler', 'Fx fortolkning'],
  composition: ['Fx idé og stemning', 'Fx melodi', 'Fx harmoni', 'Fx arrangement', 'Fx gennemgang'],
  chords: ['Fx grundtone og type', 'Fx omvending', 'Fx progression', 'Fx funktion', 'Fx øvelse'],
  formAnalysis: ['Fx exposition', 'Fx development', 'Fx recapitulation', 'Fx temaer', 'Fx helhed'],
  earTraining: ['Fx interval type', 'Fx akkordtype', 'Fx rytme', 'Fx melodilinje', 'Fx svar'],
  audioNotes: ['Fx lyttepunkt 0:45', 'Fx instrumentering', 'Fx dynamik', 'Fx form', 'Fx noter'],
  carePlan: ['Fx patientbehov', 'Fx mål', 'Fx interventioner', 'Fx ansvar', 'Fx evaluering'],
  biostatistics: ['Fx stikprøvestørrelse n', 'Fx konfidensinterval', 'Fx p-værdi', 'Fx effektstørrelse', 'Fx fortolkning'],
  pharmacology: ['Fx lægemiddel og klasse', 'Fx virkningsmekanisme', 'Fx bivirkninger', 'Fx interaktioner', 'Fx dosering'],
  diagnostics: ['Fx symptomer', 'Fx differentialdiagnoser', 'Fx test', 'Fx resultat', 'Fx diagnose'],
  regression: ['Fx afhængig variabel', 'Fx uafhængige variable', 'Fx model', 'Fx koefficienter', 'Fx fortolkning'],
  ethics: ['Fx forskningsetisk problem', 'Fx principper', 'Fx samtykke', 'Fx anonymisering', 'Fx konklusion'],
  networkAnalysis: ['Fx netværk og noder', 'Fx kanter og vægt', 'Fx centralitet', 'Fx clustering', 'Fx fortolkning'],
  comparativeMethod: ['Fx cases der sammenlignes', 'Fx variabler', 'Fx ligheder', 'Fx forskelle', 'Fx konklusion'],
  phonetics: ['Fx lyd eller fonem', 'Fx artikulationssted', 'Fx transskription', 'Fx minimalpar', 'Fx eksempel'],
  syntax: ['Fx sætningsstruktur', 'Fx led og funktion', 'Fx trædiagram', 'Fx regel', 'Fx eksempel'],
  semantics: ['Fx ord eller udtryk', 'Fx denotation', 'Fx konnotation', 'Fx kontekst', 'Fx fortolkning'],
  pragmatics: ['Fx taleakt', 'Fx kontekst', 'Fx implicit mening', 'Fx høflighed', 'Fx eksempel'],
  corpus: ['Fx korpus og størrelse', 'Fx søgeforespørgsel', 'Fx frekvens', 'Fx kollokationer', 'Fx fund'],
  forecasting: ['Fx historiske data', 'Fx modelvalg', 'Fx prognose', 'Fx usikkerhed', 'Fx fortolkning'],
  valuation: ['Fx cash flows', 'Fx WACC', 'Fx terminalværdi', 'Fx enterprise value', 'Fx sensitivitet'],
  gameTheory: ['Fx spillere og strategier', 'Fx payoff-matrix', 'Fx Nash-ligevægt', 'Fx dominant strategi', 'Fx analyse'],
  riskAnalysis: ['Fx identificerede risici', 'Fx sandsynlighed', 'Fx konsekvens', 'Fx risikoscore', 'Fx tiltag'],
  archive: ['Fx arkivmateriale', 'Fx proveniens', 'Fx kontekst', 'Fx kildekritik', 'Fx noter'],
  citationMap: ['Fx hovedforfatter', 'Fx centrale værker', 'Fx relationer', 'Fx debatter', 'Fx dit citat'],
  researchQuestion: ['Fx bredt emne', 'Fx afgrænsning', 'Fx præcist spørgsmål', 'Fx metode', 'Fx relevans'],
  table: ['Fx kolonneoverskrifter', 'Fx række 1', 'Fx række 2', 'Fx data', 'Fx konklusion'],
  quote: ['Fx »citat fra kilde«', 'Fx kilde og side', 'Fx kontekst', 'Fx betydning', 'Fx din kommentar'],
  counterpoint: ['Fx tema A', 'Fx tema B', 'Fx 4 stemmer', 'Fx parallelle oktaver', 'Fx analyse'],
  orchestration: ['Fx stryger + blæs', 'Fx violin I-II, bratsch, cello', 'Fx klangfarvevalg', 'Fx f / mf / cresc.', 'Fx begrundelse'],
  mechanics: ['Fx masse 2 kg på skrå plan', 'Fx frikropsdiagram', 'Fx ΣF = ma', 'Fx udregning', 'Fx fortolkning'],
  experimentDesign: ['Fx påvirker musik koncentration?', 'Fx uafhængig: musik ja/nej', 'Fx within-subjects design', 'Fx Stroop-test som måling', 'Fx intern validitet'],
  psychometrics: ['Fx angstskala', 'Fx Cronbachs α', 'Fx konstruktvaliditet', 'Fx n=120 studerende', 'Fx fortolkning af score'],
  theoryApply: ['Fx kognitiv dissonans', 'Fx case fra eksperiment', 'Fx anvendelse på adfærd', 'Fx metodiske begrænsninger', 'Fx konklusion'],
  brainMap: ['Fx store hjerne + stamme', 'Fx frontallap planlægning', 'Fx hippocampus hukommelse', 'Fx klassisk studie', 'Fx klinisk eksempel'],
  memoryModel: ['Fx visuelt stimulus', 'Fx arbejdshukommelse aktiv', 'Fx semantisk kodning', 'Fx genkaldelsestest', 'Fx anvendelse i opgaven'],
  cognition: ['Fx visuelt stimulus', 'Fx selektiv opmærksomhed', 'Fx beslutning om respons', 'Fx motorisk handling', 'Fx feedback fra miljø'],
  robotFlow: ['Fx Lidar + kamera', 'Fx SLAM kortlægning', 'Fx A* path planning', 'Fx PID motorstyring', 'Fx fejl ved hindring'],
  conceptMap: ['Fx kognitiv dissonans', 'Fx perception og holdning', 'Fx konflikt mellem tro og handling', 'Fx klassisk studie', 'Fx anvendelse i opgaven'],
  peerReview: ['Fx gruppeopgave udkast', 'Fx tydelig struktur og argumentation', 'Fx manglende kildehenvisning', 'Fx styrk metodeafsnittet', 'Fx godkend med revisioner'],
  reflectionLog: ['Fx praktik på hospital', 'Fx observerede kommunikationssvigt', 'Fx refleksion over egen rolle', 'Fx vigtighed af struktur', 'Fx øve ISBAR næste gang'],
  systematicReview: ['Fx effekt af mindfulness på angst', 'Fx PubMed + PsycINFO', 'Fx RCT, voksne, dansk/engelsk', 'Fx RoB 2 vurdering', 'Fx moderat effekt på angst'],
  metaAnalysis: ['Fx 12 inkluderede studier', 'Fx pooled effect size d=0,42', 'Fx moderat heterogenitet I²=38%', 'Fx publikationsbias vurderet', 'Fx støtter interventionen'],
  hypothesisTest: ['Fx H₀: μ₁=μ₂', 'Fx H₁: μ₁≠μ₂', 'Fx t=2,31, df=48', 'Fx p=0,026', 'Fx forkast H₀ på 5% niveau'],
  userStory: ['Fx studerende', 'Fx se mine deadlines', 'Fx planlægge eksamen', 'Fx vises i kalender og noter', 'Fx høj prioritet'],
  apiDesign: ['Fx POST /notes', 'Fx JSON body + 201 response', 'Fx Bearer token', 'Fx 400/401/500 fejl', 'Fx v1 namespace'],
  sprintPlanning: ['Fx færdiggør login-flow', 'Fx US-12, US-15', 'Fx 5 story points', 'Fx Anna', 'Fx testet og reviewed'],
  clinicalPathway: ['Fx mistanke om lungeemboli', 'Fx D-dimer, CT-angio', 'Fx antikoagulation', 'Fx opfølgning ambulant', 'Fx mål: diagnose <24t'],
  drugInteraction: ['Fx warfarin', 'Fx ibuprofen', 'Fx øget blødningsrisiko', 'Fx monitorér INR', 'Fx overvej alternativ analgetikum'],
  caseSeries: ['Fx 8 patienter med sjælden reaktion', 'Fx fælles hududslæt', 'Fx diagnose X', 'Fx behandling Y', 'Fx behov for større studie'],
  focusGroup: ['Fx oplevelse af onlineundervisning', 'Fx 6 studerende', 'Fx semistruktureret guide', 'Fx motivation og ensomhed', 'Fx tematisk analyse'],
  observationalStudy: ['Fx kohortestudie', 'Fx 2.400 deltagere', 'Fx rygning', 'Fx KOL efter 10 år', 'Fx confounding justeret'],
  policyBrief: ['Fx stigende ungdomsangst', 'Fx nuværende ventetid 12 uger', 'Fx tidligere indsats i skolen', 'Fx bedre adgang til psykolog', 'Fx pilot i 3 kommuner'],
  debateMap: ['Fx bør AI bruges i eksamen?', 'Fx effektivitet og feedback', 'Fx bias og snyd', 'Fx kombination med mundaftale', 'Fx ja med tydelige rammer'],
  integral: ['Fx f(x)=3x²+2x', 'Fx ∫₀² f(x)dx', 'Fx F(x)=x³+x²', 'Fx F(2)−F(0)=12', 'Fx areal under kurven'],
  derivative: ['Fx f(x)=x³−4x', 'Fx find f′(2)', 'Fx f′(x)=3x²−4', 'Fx f′(2)=8', 'Fx hældning i x=2'],
  mechanics: ['Fx m=5 kg, hældning 30°', 'Fx tyngde, normal, komponent', 'Fx F=m·g·sin(30°)', 'Fx F≈24,5 N', 'Fx a≈4,9 m/s²'],
  angles: ['Fx trekant ABC', 'Fx A=40°, B=60°', 'Fx vinkelsum=180°', 'Fx C=80°', 'Fx konsistent'],
  labReport: ['Fx absorbans vs koncentration', 'Fx spektrofotometer', 'Fx 5 koncentrationer × 3', 'Fx R²=0,98', 'Fx støtter Beer-Lambert'],
  circuit: ['Fx strøm gennem LED', 'Fx R=220Ω, Vf=2V', 'Fx seriekobling', 'Fx I≈13,6 mA', 'Fx inden for spec'],
  siUnits: ['Fx 72 km/t', 'Fx omregning til m/s', 'Fx SI: m/s', 'Fx 20 m/s', 'Fx kontrol OK'],
  python: ['Fx største tal i liste', 'Fx [4,1,7]→7', 'Fx gennemløb', 'Fx def max_value(lst)', 'Fx O(n)'],
  javascript: ['Fx valider e-mail', 'Fx input→true/false', 'Fx regex+trim', 'Fx function isValidEmail', 'Fx test edge cases'],
  debug: ['Fx returnerer NaN', 'Fx sqrt uden tjek', 'Fx negativ input', 'Fx guard clause', 'Fx forhindrer NaN'],
  physics: ['Fx v₀=15 m/s opad', 'Fx v=v₀−gt', 'Fx h≈11,5 m', 'Fx t≈1,53 s', 'Fx realistisk'],
};


function refsStorageKey() {
  const email = getSession()?.email;
  return email ? accountStorageKey(email, 'references') : 'noteit-guest-references';
}

function loadSavedReferences() {
  try { return JSON.parse(localStorage.getItem(refsStorageKey()) || '[]'); } catch { return []; }
}

function persistSavedReferences(list) {
  localStorage.setItem(refsStorageKey(), JSON.stringify(list.slice(0, 120)));
}

function saveReferenceEntry(entry) {
  const list = loadSavedReferences();
  const item = {
    id: entry.id || `ref-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: entry.type || 'book',
    style: entry.style || 'apa',
    author: entry.author || '',
    title: entry.title || '',
    year: entry.year || '',
    publisher: entry.publisher || '',
    doi: entry.doi || '',
    pages: entry.pages || '',
    journal: entry.journal || '',
    volume: entry.volume || '',
    issue: entry.issue || '',
    url: entry.url || '',
    note: entry.note || '',
    savedAt: Date.now(),
  };
  const idx = list.findIndex(r => r.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  persistSavedReferences(list);
  return item;
}

function deleteReferenceEntry(id) {
  persistSavedReferences(loadSavedReferences().filter(r => r.id !== id));
}

function formatReferenceCitation(ref, style = ref.style || 'apa') {
  const author = (ref.author || 'Ukendt forfatter').trim();
  const title = (ref.title || 'Uden titel').trim();
  const year = (ref.year || 'n.d.').trim();
  const pub = (ref.publisher || ref.journal || '').trim();
  const doi = (ref.doi || ref.url || '').trim();
  const pages = ref.pages ? `, s. ${ref.pages}` : '';
  if (style === 'harvard') {
    return `${author} (${year}) ${title}. ${pub}${pages}${doi ? `. Tilgængelig via: ${doi}` : ''}`.replace(/\s+/g, ' ').trim();
  }
  if (style === 'vancouver') {
    return `${author}. ${title}. ${pub}. ${year}${pages}${doi ? `. ${doi}` : ''}`.replace(/\s+/g, ' ').trim();
  }
  if (style === 'legal') {
    return `${author}, ${title}${pages ? `, ${pages}` : ''} (${year})${doi ? ` — ${doi}` : ''}`.replace(/\s+/g, ' ').trim();
  }
  return `${author} (${year}). ${title}. ${pub}${pages}${doi ? `. ${doi}` : ''}`.replace(/\s+/g, ' ').trim();
}

function formatInTextCitation(ref, style = ref.style || 'apa') {
  const author = (ref.author || 'Ukendt').split(',')[0].trim();
  const year = ref.year || 'n.d.';
  if (style === 'vancouver') return `[${loadSavedReferences().findIndex(r => r.id === ref.id) + 1 || 1}]`;
  if (style === 'legal') return `${author} ${year}`;
  return `(${author}, ${year})`;
}

const UNIVERSITY_TOOL_UI = {
  swot: { layout: 'quadrant', intro: 'Kortlæg situationen i fire felter — styrker, svagheder, muligheder og trusler.', tips: 'Brug konkrete observationer fra pensum, cases eller egne data.' },
  argument: { layout: 'pipeline', intro: 'Byg et tydeligt argument trin for trin — fra påstand til konklusion.', tips: 'Hvert trin bør kunne læses isoleret og stadig give mening.' },
  debateMap: { layout: 'debate', intro: 'Kortlæg en debat med argumenter for, imod og din konklusion.', tips: 'Vær fair over for modstanderens stærkeste pointe.' },
  timeline: { layout: 'timeline', intro: 'Byg et kronologisk forløb med datoer, begivenheder og betydning.', tips: 'Tænk på årsag, sammenhæng og konsekvens mellem punkterne.' },
  citationMap: { layout: 'network', intro: 'Kortlæg hvordan forfattere og værker hænger sammen i dit pensum.', tips: 'Start med dit centrale emne og byg relationer ud derfra.' },
  conceptMap: { layout: 'network', intro: 'Visualisér begreber og deres relationer omkring dit emne.', tips: 'Brug korte nøgleord — ikke hele sætninger — i hver boks.' },
  theoryCompare: { layout: 'columns', intro: 'Sammenlign to teorier side om side og vurder anvendelighed.', tips: 'Vær præcis på hvor teorierne er enige og uenige.' },
  caseComparison: { layout: 'columns', intro: 'Sammenlign to domme, cases eller eksempler systematisk.', tips: 'Fokusér på ligheder i fakta og forskelle i fortolkning.' },
  interview: { layout: 'cards', intro: 'Planlæg et interview med indledning, hovedspørgsmål og opfølgning.', tips: 'Start bredt, gå derefter dybere med opfølgende »Kan du uddybe…?«' },
  survey: { layout: 'survey', intro: 'Byg et spørgeskema med formål, variable og målbare spørgsmål.', tips: 'Undgå ledende spørgsmål — én ting ad gangen pr. spørgsmål.' },
  quote: { layout: 'quote', intro: 'Indsæt et citat med kilde, kontekst og din analyse.', tips: 'Citatet skal understøtte dit argument — ikke erstatte det.' },
  qualitativeCoding: { layout: 'coding', intro: 'Kod kvalitative data fra citat til tema.', tips: 'Hold koderne korte og lad temaerne vokse ud af mønstre.' },
  closeReading: { layout: 'reading', intro: 'Analyser et tekststed ord for ord med virkemidler og fortolkning.', tips: 'Citer præcist og forklar effekten — ikke bare hvad der står.' },
  sourceAnalysis: { layout: 'source', intro: 'Vurder en kilde kritisk: afsender, formål, tendens og troværdighed.', tips: 'Spørg altid: Hvem skrev det, hvorfor, og kan jeg stole på det?' },
  evidence: { layout: 'evidence', intro: 'Vurder evidens efter studietype, resultat og bias.', tips: 'Brug PICO eller tilsvarende struktur til kliniske spørgsmål.' },
  patientCase: { layout: 'case', intro: 'Dokumentér en patientcase fra anamnese til evaluering.', tips: 'Hold fakta og vurdering adskilt — ISBAR kan hjælpe.' },
  caseStudy: { layout: 'case', intro: 'Analyser en case med teori, empiri og anbefaling.', tips: 'Problemstillingen skal være skarp nok til at guide analysen.' },
  researchDesign: { layout: 'pipeline', intro: 'Planlæg et forskningsdesign fra spørgsmål til validitet.', tips: 'Operationalisér variable tidligt — hvordan måler du dem?' },
  literatureReview: { layout: 'pipeline', intro: 'Strukturér en litteraturoversigt systematisk.', tips: 'Gruppér studier efter tema — ikke bare kronologisk.' },
  legalMethod: { layout: 'pipeline', intro: 'Løs et juridisk problem med lov, fortolkning og anvendelse.', tips: 'Faktum → retsregel → subsumption → konklusion.' },
  legislation: { layout: 'legal', intro: 'Analyser en lovbestemmelse med paragraf, betingelser og retsfølge.', tips: 'Citer paragrafen præcist og angiv lovens titel.' },
  caseLaw: { layout: 'legal', intro: 'Analyser en dom fra faktum til præjudikatværdi.', tips: 'Adskil rettens begrundelse fra dit eget synspunkt.' },
  experimentDesign: { layout: 'experiment', intro: 'Design et eksperiment med variable, kontrol og validitet.', tips: 'Operationalisér uafhængig og afhængig variabel tydeligt.' },
  psychometrics: { layout: 'pipeline', intro: 'Vurder en skala for pålidelighed og validitet.', tips: 'Cronbachs α > 0,7 er ofte acceptabelt — men kontekst tæller.' },
  econometrics: { layout: 'math', intro: 'Specificér og fortolk en økonometrisk model.', tips: 'Tjek antagelser før du fortolker koefficienter.' },
  finance: { layout: 'math', intro: 'Beregn og vurder en finansiel beslutning.', tips: 'Vis mellemregning og angiv antagelser om rente og risiko.' },
  regression: { layout: 'math', intro: 'Opstil og fortolk en regressionsmodel.', tips: 'Fortolk tegn, størrelse og signifikans — ikke kun p-værdi.' },
  hypothesisTest: { layout: 'math', intro: 'Formulér og test hypoteser systematisk.', tips: 'H₀ og H₁ skal være gensidigt udelukkende.' },
  vocabulary: { layout: 'vocab', intro: 'Byg et ordforrådskort med betydning, bøjning og eksempel.', tips: 'Brug ordet aktivt i en egen sætning til sidst.' },
  translation: { layout: 'quote', intro: 'Oversæt og begrund dine valg sprogligt.', tips: 'Notér nuancer og alternativer — oversættelse er fortolkning.' },
  grammar: { layout: 'reading', intro: 'Analyser sætningsstruktur, ordklasse og syntaks.', tips: 'Start med at identificere hovedledd og biledd.' },
  peerReview: { layout: 'review', intro: 'Giv struktureret feedback på en tekst eller opgave.', tips: 'Vær specifik: peg på stedet og foreslå en forbedring.' },
  reflectionLog: { layout: 'reflection', intro: 'Reflekter over en oplevelse med observation og læring.', tips: 'Beskriv hvad du gjorde anderledes bagefter.' },
  systematicReview: { layout: 'pipeline', intro: 'Planlæg en systematisk review med søgning og kvalitetsvurdering.', tips: 'Dokumentér inklusionskriterier før du søger.' },
  policyBrief: { layout: 'debate', intro: 'Skriv et kort politiknotat med problem, anbefaling og konsekvens.', tips: 'Maks 1 side — beslutningstagere har lidt tid.' },
  userStory: { layout: 'cards', intro: 'Formulér en user story med acceptkriterier.', tips: 'Som [rolle] vil jeg [handling] så jeg kan [værdi].' },
  clinicalPathway: { layout: 'pipeline', intro: 'Kortlæg et klinisk forløb fra indikation til opfølgning.', tips: 'Inkludér beslutningspunkter og kvalitetsmål.' },
  drugInteraction: { layout: 'columns', intro: 'Dokumentér en lægemiddelinteraktion og klinisk handling.', tips: 'Angiv altid mekanisme og monitoreringsplan.' },
  archive: { layout: 'source', intro: 'Analyser arkivmateriale med proveniens og kildekritik.', tips: 'Hvem skabte det, hvorfor blev det gemt, og hvad kan det bruges til?' },
  researchQuestion: { layout: 'pipeline', intro: 'Formuler et skarpt forskningsspørgsmål trin for trin.', tips: 'Bredt emne → afgrænsning → præcist spørgsmål → metode.' },
  ethics: { layout: 'debate', intro: 'Vurder et forskningsetisk dilemma struktureret.', tips: 'Balancér deltagernes rettigheder med forskningens værdi.' },
  networkAnalysis: { layout: 'network', intro: 'Kortlæg et netværk af aktører, relationer og centralitet.', tips: 'Definér noder og kanter tydeligt før analysen.' },
  comparativeMethod: { layout: 'columns', intro: 'Sammenlign cases systematisk med kontrollerede variable.', tips: 'Vælg cases der maksimerer lighed på alt undtagen det du studerer.' },
  gameTheory: { layout: 'matrix', intro: 'Analyser strategier og payoff i et spil.', tips: 'Find Nash-ligevægt og overvej dominant strategi.' },
  riskAnalysis: { layout: 'matrix', intro: 'Identificér og vurder risici med sandsynlighed og konsekvens.', tips: 'Brug en risikomatrix: lav/medium/høj.' },
  forecasting: { layout: 'math', intro: 'Byg en prognose med model og usikkerhed.', tips: 'Angiv altid konfidensinterval eller scenarie.' },
  valuation: { layout: 'math', intro: 'Værdiansæt med cash flows, WACC og følsomhed.', tips: 'Terminalværdi og diskonteringsrente er ofte afgørende.' },
  biostatistics: { layout: 'math', intro: 'Analyser biostatistiske data med fortolkning.', tips: 'Angiv n, konfidensinterval og effektstørrelse.' },
  pharmacology: { layout: 'case', intro: 'Dokumentér et lægemiddel: mekanisme, bivirkninger og dosering.', tips: 'Inkludér kontraindikationer og monitorering.' },
  diagnostics: { layout: 'case', intro: 'Strukturér en diagnostisk proces fra symptom til plan.', tips: 'Differentialdiagnoser rangeres efter sandsynlighed.' },
  carePlan: { layout: 'pipeline', intro: 'Planlæg pleje med mål, interventioner og evaluering.', tips: 'SMART-mål: specifikke, målbare, realistiske.' },
  phonetics: { layout: 'vocab', intro: 'Analyser lyde, artikulation og transskription.', tips: 'Brug IPA-tegn hvor det er relevant.' },
  syntax: { layout: 'reading', intro: 'Analyser sætningsstruktur med trædiagram.', tips: 'Identificér subjekt, verbal og objekt først.' },
  semantics: { layout: 'vocab', intro: 'Undersøg betydning: denotation, konnotation og kontekst.', tips: 'Giv eksempler på polysemi og synonymi.' },
  pragmatics: { layout: 'reading', intro: 'Analyser sprog i brug: taleakter og implicit mening.', tips: 'Hvad siger sproget, og hvad mener taleren?' },
  corpus: { layout: 'source', intro: 'Dokumentér en korpusanalyse med frekvens og kollokationer.', tips: 'Angiv korpusstørrelse og søgeforespørgsel.' },
  precedent: { layout: 'legal', intro: 'Analyser et præjudikat og dets anvendelse.', tips: 'Hvad er retsprincippet, og hvornår gælder det?' },
  contract: { layout: 'legal', intro: 'Analyser en kontrakt: parter, betingelser og misligholdelse.', tips: 'Identificér tilbud, accept og eventuelle forbehold.' },
  euLaw: { layout: 'legal', intro: 'Kortlæg EU-ret: primær/sekundær ret og dansk implementering.', tips: 'Skeln mellem forordning (direkte) og direktiv (implementering).' },
  humanRights: { layout: 'legal', intro: 'Analyser en menneskeret: rettighed, indskrænkning og proportionalitet.', tips: 'EMRK artikel → indskrænkning → legitimt formål → nødvendighed.' },
  legalCitation: { layout: 'legal', intro: 'Formulér korrekte juridiske henvisninger.', tips: 'Lov: lov nr. X af [dato]. Dom: U [år]. [side].' },
  legalIssue: { layout: 'legal', intro: 'Løs et juridisk problem med fakta, regel og konklusion.', tips: 'Subsumption: anvend reglen på de konkrete fakta.' },
  formAnalysis: { layout: 'music', intro: 'Analyser musikalsk form: exposition, development, recapitulation.', tips: 'Identificér temaer og moduler før du navngiver formen.' },
  composition: { layout: 'music', intro: 'Planlæg en komposition fra idé til gennemgang.', tips: 'Start med en klar idé — melodisk, harmonisk eller rytmisk.' },
  audioNotes: { layout: 'music', intro: 'Tag strukturerede lytte-noter med tidsstempler.', tips: 'Notér instrumentering, dynamik og form undervejs.' },
  counterpoint: { layout: 'music', intro: 'Analyser kontrapunkt: temaer, stemmer og regler.', tips: 'Følg parallelle oktaver og konsekutive kvinter/quart.' },
  orchestration: { layout: 'music', intro: 'Planlæg instrumentation og klangfarver.', tips: 'Tænk i registre: høj, mellem, lav — og i dynamik.' },
  metaAnalysis: { layout: 'math', intro: 'Syntetisér studier med effektstørrelse og heterogenitet.', tips: 'Rapporter I² og overvej publikationsbias.' },
  focusGroup: { layout: 'cards', intro: 'Planlæg en fokusgruppe med guide og temaer.', tips: '6-8 deltagere er typisk optimalt.' },
  observationalStudy: { layout: 'experiment', intro: 'Design et observationsstudie med bias-kontrol.', tips: 'Kohort, case-control eller tværsnitsdesign?' },
  caseSeries: { layout: 'case', intro: 'Dokumentér en caseserie med fælles fund og læring.', tips: 'Beskriv population, fund, diagnose og behandling.' },
  dosage: { layout: 'case', intro: 'Beregn og kontrollér en dosering.', tips: 'Dobbeltkontrollér mod patientens vægt, alder og nyrefunktion.' },
  anatomy: { layout: 'case', intro: 'Beskriv anatomi: struktur, placering og klinisk betydning.', tips: 'Relatér til nabostrukturer og blodforsyning.' },
  epidemiology: { layout: 'math', intro: 'Beregn epidemiologiske mål som RR, OR og CI.', tips: 'Overvej confounding og selektionsbias.' },
  clinicalReasoning: { layout: 'case', intro: 'Strukturér klinisk ræsonnering fra fund til plan.', tips: 'Hypoteser → differentialdiagnoser → tests → behandling.' },
  accounting: { layout: 'math', intro: 'Analyser regnskabstal og beregn nøgletal.', tips: 'Omsætning, omkostninger, resultat — derefter ratioer.' },
  demandSupply: { layout: 'matrix', intro: 'Analyser marked med udbud, efterspørgsel og ligevægt.', tips: 'Tegn kurveskift og forklar pris- og mængdeeffekt.' },
  hermeneutics: { layout: 'reading', intro: 'Fortolk tekst hermeneutisk: del, helhed og refleksion.', tips: 'Hvordan ændrer helheden din forståelse af delene?' },
  discourse: { layout: 'source', intro: 'Analyser diskurs: begreber, positioner og magt.', tips: 'Hvem taler, hvad siger de, og hvad tages for givet?' },
  theoryApply: { layout: 'pipeline', intro: 'Anvend teori på empiri trin for trin.', tips: 'Teori → case → anvendelse → begrænsninger.' },
  brainMap: { layout: 'network', intro: 'Kortlæg hjerneområder og deres funktion.', tips: 'Relatér struktur til adfærd og kliniske eksempler.' },
  memoryModel: { layout: 'pipeline', intro: 'Beskriv hukommelsesprocesser fra stimulus til genkaldelse.', tips: 'Brug Atkinson-Shiffrin eller Baddeley som udgangspunkt.' },
  cognition: { layout: 'pipeline', intro: 'Kortlæg en kognitiv proces fra perception til handling.', tips: 'Inkludér opmærksomhed, beslutning og feedback.' },
  robotFlow: { layout: 'pipeline', intro: 'Design et robot-flow fra sensor til aktuator.', tips: 'Perception → planlægning → kontrol → feedback.' },
  integral: { layout: 'math', intro: 'Regn og dokumentér et integral trin for trin.', tips: 'Tjek grænser, stamfunktion og enheder i fortolkningen.' },
  derivative: { layout: 'math', intro: 'Differentier og fortolk resultatet systematisk.', tips: 'Angiv regel, mellemregning og geometrisk betydning.' },
  mechanics: { layout: 'math', intro: 'Løs et mekanikproblem med kræfter, ligninger og fortolkning.', tips: 'Tegn friløbsdiagram og kontrollér SI-enheder.' },
  angles: { layout: 'math', intro: 'Løs vinkel- og geometriopgaver med tydelig begrundelse.', tips: 'Navngiv sætninger og angiv givne værdier først.' },
  algorithm: { layout: 'coding', intro: 'Design en algoritme fra krav til kompleksitetsvurdering.', tips: 'Beskriv input, output og edge cases før pseudokode.' },
  siUnits: { layout: 'math', intro: 'Omregn og kontrollér SI-enheder korrekt.', tips: 'Skriv omregningsfaktoren eksplicit — ikke kun resultatet.' },
  labReport: { layout: 'experiment', intro: 'Strukturér et laboratorienotat efter videnskabelig metode.', tips: 'Adskil observation, beregning og konklusion tydeligt.' },
  circuit: { layout: 'pipeline', intro: 'Analyser et kredsløb fra komponenter til måling.', tips: 'Angiv spænding, strøm og effekt — kontrollér enheder.' },
  calculator: { layout: 'math', intro: 'Dokumentér en beregning med mellemregning og kontrol.', tips: 'Vis udtryk, indsætning og resultat — ikke kun svaret.' },
  python: { layout: 'coding', intro: 'Planlæg Python-kode med test og kompleksitet.', tips: 'Beskriv funktionssignatur og fejlhåndtering.' },
  javascript: { layout: 'coding', intro: 'Strukturér JavaScript/TypeScript-arbejde fra idé til test.', tips: 'Overvej async, typer og edge cases.' },
  java: { layout: 'coding', intro: 'Design Java-løsning med klasser, metoder og test.', tips: 'Angiv input/output og undtagelseshåndtering.' },
  cpp: { layout: 'coding', intro: 'Dokumentér C/C++-kode med hukommelse og performance.', tips: 'Notér pointere, allokering og kompileringsflag.' },
  go: { layout: 'coding', intro: 'Planlæg Go-program med goroutines og interfaces.', tips: 'Beskriv concurrency og fejlretur tydeligt.' },
  rust: { layout: 'coding', intro: 'Strukturér Rust-kode med ejerskab og sikkerhed.', tips: 'Overvej borrow checker og Result/Option.' },
  sql: { layout: 'coding', intro: 'Byg og dokumentér SQL-forespørgsler.', tips: 'Angiv tabeller, joins og forventet output.' },
  web: { layout: 'coding', intro: 'Planlæg HTML/CSS/JS med struktur og tilgængelighed.', tips: 'Semantisk markup og responsivt layout.' },
  matlab: { layout: 'math', intro: 'Dokumentér MATLAB/Octave-beregninger.', tips: 'Angiv vektorer, matricer og plot-beskrivelse.' },
  arduino: { layout: 'pipeline', intro: 'Design Arduino/embedded-flow fra sensor til output.', tips: 'Pinout, timing og strømforbrug er centrale.' },
  ros: { layout: 'pipeline', intro: 'Kortlæg ROS-noder, topics og services.', tips: 'Beskriv publish/subscribe og koordinatsystem.' },
  debug: { layout: 'coding', intro: 'Fejlfind systematisk: symptom → årsag → fix.', tips: 'Vis fejlende kode og den rettede version side om side.' },
  libraries: { layout: 'source', intro: 'Dokumentér bibliotek, API og afhængigheder.', tips: 'Version, licens og vigtigste funktioner.' },
  physics: { layout: 'math', intro: 'Løs fysikopgaver med teori, enheder og fortolkning.', tips: 'Skriv formler, indsæt tal og kontrollér størrelsesorden.' },
  apiDesign: { layout: 'coding', intro: 'Design et API med endpoints og fejlhåndtering.', tips: 'REST-konventioner og versionering fra start.' },
  sprintPlanning: { layout: 'cards', intro: 'Planlæg sprint med mål, backlog og ansvar.', tips: 'Definition of done skal være målbar.' },
  notation: { layout: 'music', intro: 'Analyser og notér musikalske passager.', tips: 'Takt, toneart og rytme før harmonisk analyse.' },
  harmony: { layout: 'music', intro: 'Analyser harmonisk progression og stemmeføring.', tips: 'Funktionstoner og kadencer er nøglen.' },
  rhythm: { layout: 'music', intro: 'Dokumentér rytme, taktart og synkoper.', tips: 'Tæl takter og markér gentagelser.' },
  chords: { layout: 'music', intro: 'Kortlæg akkorder, omvendinger og funktion.', tips: 'Grundtone, type og progression i kontekst.' },
  earTraining: { layout: 'music', intro: 'Træn hørelære med interval, akkord og melodi.', tips: 'Beskriv hvad du hører før du tjekker svaret.' },
  epsilonDelta: { layout: 'math', intro: 'Bevis grænseværdier med epsilon-delta.', tips: 'Vælg δ som funktion af ε — vis ulighedskæden.' },
  summation: { layout: 'math', intro: 'Analyser rækker og følger med sigma-notation.', tips: 'Konvergenskriterium før partialsum.' },
  quantumMechanics: { layout: 'math', intro: 'Arbejd med kvantetilstande og operatorer.', tips: 'Normalisér |ψ⟩ og tjek usikkerhedsrelationen.' },
  quantumPhysics: { layout: 'math', intro: 'Løs kvantfysik med Planck, de Broglie og bølgefunktion.', tips: 'Sammenlign med klassisk grænse.' },
  linearAlgebra: { layout: 'math', intro: 'Arbejd med vektorer, matricer og transformationer.', tips: 'Egenværdier kræver det(A−λI)=0.' },
  differentialEquations: { layout: 'math', intro: 'Løs differentialligninger med metode og fortolkning.', tips: 'Begyndelsesbetingelser og stabilitet tæller.' },
  analysis: { layout: 'math', intro: 'Bevis sætninger i real analyse.', tips: 'Start fra definitionen — ε-N eller ε-δ.' },
  complexAnalysis: { layout: 'math', intro: 'Analyser komplekse funktioner og integraler.', tips: 'Holomorfi og residuer er centrale værktøjer.' },
  probability: { layout: 'math', intro: 'Løs sandsynlighedsopgaver med fordelinger.', tips: 'Angiv udfaldsrum og notation tydeligt.' },
  numericalMethods: { layout: 'math', intro: 'Anvend numeriske metoder med fejlestimat.', tips: 'Konvergens og stabilitet skal dokumenteres.' },
  optimization: { layout: 'math', intro: 'Optimer med begrænsninger og optimalitetsbetingelser.', tips: 'KKT eller simplex — vis mellemregning.' },
  geometry: { layout: 'math', intro: 'Løs geometri med koordinater og transformationer.', tips: 'Tegn figur og angiv givne mål.' },
  topology: { layout: 'math', intro: 'Arbejd med topologiske rum og kontinuitet.', tips: 'Definitioner før sætninger — vær præcis.' },
  discreteMath: { layout: 'math', intro: 'Kombinatorik, grafer og diskret bevisførelse.', tips: 'Induktion kræver basis og induktionsskridt.' },
  numberTheory: { layout: 'math', intro: 'Løs talteori med kongruenser og primtal.', tips: 'Modulo-argument og faktorisering.' },
  logic: { layout: 'math', intro: 'Formuler påstande og før beviser.', tips: 'Kvantorer og mod-eksempler skal være præcise.' },
  statistics: { layout: 'math', intro: 'Analyser data med test og konfidensintervaller.', tips: 'Angiv n, α og effektstørrelse — ikke kun p.' },
};

const PACK_TOOL_UI = {
  stem: { layout: 'math', intro: 'Strukturer dit STEM-arbejde med formler, enheder og fortolkning.', tips: 'Skriv mellemregninger og kontrollér enheder.' },
  coding: { layout: 'coding', intro: 'Planlæg kode, test og dokumentation trin for trin.', tips: 'Beskriv input, output og edge cases.' },
  law: { layout: 'legal', intro: 'Løs juridiske problemstillinger med kilder og subsumption.', tips: 'Faktum → regel → anvendelse → konklusion.' },
  health: { layout: 'case', intro: 'Dokumentér klinisk arbejde sikkert og struktureret.', tips: 'Adskil observation fra vurdering og handling.' },
  music: { layout: 'music', intro: 'Analyser musik med notation, form og fortolkning.', tips: 'Lyt aktivt — notér tidsstempler undervejs.' },
  languages: { layout: 'vocab', intro: 'Arbejd sprogligt med ord, struktur og nuance.', tips: 'Brug ordet aktivt i en egen sætning.' },
  humanities: { layout: 'reading', intro: 'Analyser tekst og kilde med teori og dokumentation.', tips: 'Citer præcist og forklar effekten.' },
  social: { layout: 'pipeline', intro: 'Strukturér samfundsvidenskabeligt arbejde metodisk.', tips: 'Operationalisér variable tidligt.' },
  economics: { layout: 'math', intro: 'Modellér økonomiske problemstillinger med antagelser.', tips: 'Vis beregning og følsomhed.' },
  psychology: { layout: 'pipeline', intro: 'Kortlæg psykologiske fænomener med teori og metode.', tips: 'Adskil teori, design og fortolkning.' },
  general: { layout: 'enhanced', intro: 'Strukturer dit arbejde trin for trin.', tips: 'Udfyld med konkrete oplysninger fra dit pensum.' },
};

function getUniversityToolUi(tool, packId) {
  return UNIVERSITY_TOOL_UI[tool] || PACK_TOOL_UI[packId] || PACK_TOOL_UI.general;
}

function cleanExampleText(text) {
  return String(text || '').replace(/^Eksempel:\s*/i, '').replace(/^»|«$/g, '').trim();
}

function getUniversityToolExamples(tool, packId, fieldCount) {
  const fromTemplate = templateFieldExamples[tool];
  if (fromTemplate?.length) return fromTemplate.map(cleanExampleText);
  const fromCategory = categoryFieldExamples[packId] || categoryFieldExamples.general;
  return fromCategory.slice(0, fieldCount).map(cleanExampleText);
}

function fillUniversityToolExample(dialog) {
  const tool = dialog.dataset.tool;
  const packId = dialog.dataset.pack || 'general';
  const fields = [...dialog.querySelectorAll('[data-university-tool-field]')];
  const examples = getUniversityToolExamples(tool, packId, fields.length);
  fields.forEach((field, index) => {
    if (examples[index]) field.value = examples[index];
  });
  const btn = dialog.querySelector('#fillUniversityToolExample');
  if (btn) {
    btn.textContent = 'Eksempel indsat ✓';
    setTimeout(() => { btn.textContent = 'Udfyld eksempel'; }, 1400);
  }
}

function universityToolAiPrompt(tool, packId, title) {
  const packLabel = toolPacks[packId]?.label || 'det valgte fag';
  const ui = getUniversityToolUi(tool, packId);
  const layoutHint = {
    math: 'Bevar formler og mellemregninger. Ret kun åbenlyse fejl — opfind ikke tal.',
    legal: 'Følg juridisk metode: faktum, retsregel, subsumption, konklusion. Opfind ikke lovhenvisninger.',
    coding: 'Bevar kode og logik. Foreslå forbedringer kun hvor brugeren har efterladt huller.',
    case: 'Adskil observation, vurdering og plan. Opfind ikke patientdata.',
    experiment: 'Bevar hypotese, metode og data. Opfind ikke målinger.',
    quote: 'Bevar citatet ordret. Forbedr kun kildehenvisning og analyse.',
  }[ui.layout] || 'Bevar brugerens oplysninger. Ret uklarheder forsigtigt — opfind ikke kilder.';
  return `Du er faglig universitetsvejleder i ${packLabel}. Bearbejd brugerens udfyldte ${title}-værktøj. ${layoutHint} Skriv et færdigt, struktureret resultat klar til indsættelse i noter.`;
}

function universityToolIntroHtml(tool, packId) {
  const ui = getUniversityToolUi(tool, packId);
  if (!ui?.intro) return '';
  return `<div class="university-tool-intro"><p>${escapeHtml(ui.intro)}</p>${ui.tips ? `<small>${escapeHtml(ui.tips)}</small>` : ''}</div>`;
}

function universityToolFieldHtml(section, index, packId, tool, extra = {}) {
  const starter = universityToolStarter('', section, index, packId, tool);
  const wide = extra.wide ? ' university-tool-field-wide' : '';
  const icon = extra.icon ? `<span class="university-tool-field-icon">${extra.icon}</span>` : '';
  const tag = extra.multiline === false ? 'input' : 'textarea';
  const attrs = extra.multiline === false
    ? `type="text" data-university-tool-field data-label="${escapeHtml(section)}" placeholder="${escapeHtml(starter)}"`
    : `data-university-tool-field data-label="${escapeHtml(section)}" rows="${extra.rows || 2}" placeholder="${escapeHtml(starter)}"`;
  return `<label class="university-tool-field${wide}">${icon}<span>${escapeHtml(section)}</span><${tag} ${attrs}></${tag}></label>`;
}

function renderUniversityToolFields(tool, sections, packId, title = '') {
  const ui = getUniversityToolUi(tool, packId);
  const intro = universityToolIntroHtml(tool, packId);
  const layout = ui.layout || 'enhanced';
  const wrap = body => `${intro}${universityToolFigurePanelHtml(tool, packId, sections, title)}${body}`;
  if (layout === 'quadrant') {
    const labels = sections.length >= 4 ? sections.slice(0, 4) : ['Styrker', 'Svagheder', 'Muligheder', 'Trusler'];
    const colors = ['strength', 'weakness', 'opportunity', 'threat'];
    return wrap(`<div class="university-tool-quadrant">${labels.map((label, i) => universityToolFieldHtml(label, i, packId, tool, { wide: false, icon: ['+', '−', '↗', '!'][i], rows: 3 })).map((html, i) => `<div class="quadrant-cell quadrant-${colors[i]}">${html}</div>`).join('')}</div>`);
  }
  if (layout === 'pipeline') {
    return wrap(`<div class="university-tool-pipeline">${sections.map((section, i) => `<div class="pipeline-step"><span class="pipeline-num">${i + 1}</span>${universityToolFieldHtml(section, i, packId, tool, { wide: true, rows: 2 })}</div>`).join('')}</div>`);
  }
  if (layout === 'timeline') {
    return wrap(`<div class="university-tool-timeline">${sections.map((section, i) => `<div class="timeline-step"><span class="timeline-dot"></span>${universityToolFieldHtml(section, i, packId, tool, { rows: 2 })}</div>`).join('')}</div>`);
  }
  if (layout === 'debate') {
    const forLabel = sections[1] || 'Argument for';
    const againstLabel = sections[2] || 'Argument imod';
    const claim = sections[0] || 'Påstand';
    const counter = sections[3] || 'Modargument';
    const conclusion = sections[4] || 'Konklusion';
    return wrap(`<div class="university-tool-debate">
      <div class="debate-claim">${universityToolFieldHtml(claim, 0, packId, tool, { wide: true, icon: '◆', rows: 2 })}</div>
      <div class="debate-columns">
        <div class="debate-for">${universityToolFieldHtml(forLabel, 1, packId, tool, { icon: '+', rows: 4 })}</div>
        <div class="debate-against">${universityToolFieldHtml(againstLabel, 2, packId, tool, { icon: '−', rows: 4 })}</div>
      </div>
      <div class="debate-footer">
        ${universityToolFieldHtml(counter, 3, packId, tool, { icon: '↔', rows: 2 })}
        ${universityToolFieldHtml(conclusion, 4, packId, tool, { icon: '→', rows: 2 })}
      </div>
    </div>`);
  }
  if (layout === 'network') {
    const center = sections[0] || 'Centralt emne';
    const rest = sections.slice(1);
    return wrap(`<div class="university-tool-network">
      <div class="network-center">${universityToolFieldHtml(center, 0, packId, tool, { wide: true, icon: '◎', rows: 2 })}</div>
      <div class="network-orbit">${rest.map((section, i) => `<div class="network-node">${universityToolFieldHtml(section, i + 1, packId, tool, { icon: ['→', '↗', '↘', '←', '↙'][i % 5], rows: 3 })}</div>`).join('')}</div>
    </div>`);
  }
  if (layout === 'columns') {
    const mid = Math.ceil(sections.length / 2);
    const left = sections.slice(0, mid);
    const right = sections.slice(mid);
    return wrap(`<div class="university-tool-columns">
      <div class="tool-column"><span class="tool-column-label">A</span>${left.map((s, i) => universityToolFieldHtml(s, i, packId, tool, { rows: 2 })).join('')}</div>
      <div class="tool-column"><span class="tool-column-label">B</span>${right.map((s, i) => universityToolFieldHtml(s, i + left.length, packId, tool, { rows: 2 })).join('')}</div>
    </div>`);
  }
  if (layout === 'cards') {
    return wrap(`<div class="university-tool-cards">${sections.map((section, i) => `<div class="tool-card">${universityToolFieldHtml(section, i, packId, tool, { icon: String(i + 1), rows: 3 })}</div>`).join('')}</div>`);
  }
  if (layout === 'survey') {
    return wrap(`<div class="university-tool-survey">
      ${sections.slice(0, 3).map((section, i) => universityToolFieldHtml(section, i, packId, tool, { icon: ['◎', '◎', '▤'][i], rows: 2 })).join('')}
      <div class="survey-questions">
        <span class="survey-label">Spørgsmål</span>
        ${[4, 5].map(i => universityToolFieldHtml(sections[i] || `Spørgsmål ${i - 2}`, i, packId, tool, { icon: '?', rows: 2 })).join('')}
      </div>
    </div>`);
  }
  if (layout === 'quote') {
    return wrap(`<div class="university-tool-quote">
      <div class="quote-main">${universityToolFieldHtml(sections[0] || 'Citat', 0, packId, tool, { wide: true, icon: '“', rows: 3 })}</div>
      <div class="quote-meta">${sections.slice(1).map((section, i) => universityToolFieldHtml(section, i + 1, packId, tool, { icon: ['¶', '◎', '→'][i] || '·', rows: 2 })).join('')}</div>
    </div>`);
  }
  if (layout === 'coding') {
    return wrap(`<div class="university-tool-coding">${sections.map((section, i) => `<div class="coding-row"><span class="coding-step">${['1', '2', '3', '4', '5'][i] || '·'}</span>${universityToolFieldHtml(section, i, packId, tool, { rows: i === 0 ? 3 : 2 })}</div>`).join('')}</div>`);
  }
  if (layout === 'reading' || layout === 'source' || layout === 'legal' || layout === 'music' || layout === 'math' || layout === 'evidence' || layout === 'case' || layout === 'experiment' || layout === 'review' || layout === 'reflection' || layout === 'vocab') {
    const icons = { reading: ['¶', 'Aa', '◎', '↗'], source: ['◎', '→', '⚖', '“', '✓'], legal: ['§', 'F', 'R', '→', '✓'], music: ['♪', '▤', '♩', '◎', '→'], math: ['∑', 'x', '≈', '↗', '→'], evidence: ['?', '▤', '◎', '↗', '⚖', '→'], case: ['+', '◎', '→', 'Rx', '✓'], experiment: ['?', '↔', '▤', '◎', '⚖'], review: ['▤', '+', '−', '→', '✓'], reflection: ['◎', '◎', '→', '✦', '↗'], vocab: ['Aa', '?', '↗', '“', '→'] };
    const set = icons[layout] || icons.reading;
    return wrap(`<div class="university-tool-enhanced ${layout}">${sections.map((section, i) => universityToolFieldHtml(section, i, packId, tool, { icon: set[i] || '·', rows: i === 0 ? 3 : 2, wide: i === sections.length - 1 && sections.length % 2 === 1 })).join('')}</div>`);
  }
  if (layout === 'matrix') {
    return wrap(`<div class="university-tool-matrix">${sections.map((section, i) => universityToolFieldHtml(section, i, packId, tool, { icon: ['◎', '↗', '↘', '→', '✓'][i] || '·', rows: 2 })).join('')}</div>`);
  }
  return wrap(`<div class="university-tool-enhanced">${sections.map((section, i) => universityToolFieldHtml(section, i, packId, tool, { icon: String(i + 1), rows: 2, wide: i === sections.length - 1 && sections.length % 2 === 1 })).join('')}</div>`);
}

function collectUniversityToolFields(dialog) {
  return [...dialog.querySelectorAll('[data-university-tool-field]')].map(field => ({
    label: field.dataset.label,
    value: (field.value || '').trim(),
  })).filter(item => item.value);
}

function buildUniversityToolHtml(tool, title, fields, packId = 'general') {
  const resolvedUi = getUniversityToolUi(tool, packId);
  return buildUniversityToolHtmlByLayout(resolvedUi.layout || 'enhanced', title, fields);
}

function buildUniversityToolHtmlByLayout(layout, title, fields) {
  const esc = value => escapeHtml(value || '').replace(/\n/g, '<br>');
  const rows = fields.map(f => `<p><strong>${escapeHtml(f.label)}:</strong> ${esc(f.value)}</p>`).join('');
  if (layout === 'quadrant') {
    const labels = fields.map(f => f.label);
    const cells = fields.slice(0, 4).map((f, i) => `<div class="note-quadrant note-quadrant-${['s', 'w', 'o', 't'][i]}"><b>${escapeHtml(labels[i] || f.label)}</b><p>${esc(f.value)}</p></div>`).join('');
    return `<div class="note-tool-block note-swot"><h3>${escapeHtml(title)}</h3><div class="note-quadrant-grid">${cells}</div></div><p><br></p>`;
  }
  if (layout === 'timeline') {
    const items = fields.map(f => `<div class="note-timeline-item"><span class="note-timeline-dot"></span><div><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div></div>`).join('');
    return `<div class="note-tool-block note-timeline"><h3>${escapeHtml(title)}</h3>${items}</div><p><br></p>`;
  }
  if (layout === 'debate') {
    const claim = fields[0];
    const forArg = fields[1];
    const against = fields[2];
    const counter = fields[3];
    const conclusion = fields[4];
    return `<div class="note-tool-block note-debate"><h3>${escapeHtml(title)}</h3>
      ${claim ? `<div class="note-debate-claim"><b>${escapeHtml(claim.label)}</b><p>${esc(claim.value)}</p></div>` : ''}
      <div class="note-debate-grid">
        ${forArg ? `<div class="note-debate-for"><b>${escapeHtml(forArg.label)}</b><p>${esc(forArg.value)}</p></div>` : ''}
        ${against ? `<div class="note-debate-against"><b>${escapeHtml(against.label)}</b><p>${esc(against.value)}</p></div>` : ''}
      </div>
      ${counter ? `<p><strong>${escapeHtml(counter.label)}:</strong> ${esc(counter.value)}</p>` : ''}
      ${conclusion ? `<p class="note-debate-conclusion"><strong>${escapeHtml(conclusion.label)}:</strong> ${esc(conclusion.value)}</p>` : ''}
    </div><p><br></p>`;
  }
  if (layout === 'quote') {
    const quote = fields[0];
    const rest = fields.slice(1).map(f => `<p><strong>${escapeHtml(f.label)}:</strong> ${esc(f.value)}</p>`).join('');
    return `<div class="note-tool-block note-quote"><h3>${escapeHtml(title)}</h3><blockquote>${esc(quote?.value || '')}</blockquote>${rest}</div><p><br></p>`;
  }
  if (layout === 'pipeline') {
    const steps = fields.map((f, i) => `<div class="note-pipeline-step"><span>${i + 1}</span><div><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div></div>`).join('');
    return `<div class="note-tool-block note-pipeline"><h3>${escapeHtml(title)}</h3>${steps}</div><p><br></p>`;
  }
  if (layout === 'columns') {
    const mid = Math.ceil(fields.length / 2);
    const left = fields.slice(0, mid).map(f => `<div class="note-column-item"><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div>`).join('');
    const right = fields.slice(mid).map(f => `<div class="note-column-item"><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div>`).join('');
    return `<div class="note-tool-block note-columns"><h3>${escapeHtml(title)}</h3><div class="note-columns-grid"><div class="note-column">${left}</div><div class="note-column">${right}</div></div></div><p><br></p>`;
  }
  if (layout === 'network') {
    const center = fields[0];
    const nodes = fields.slice(1).map(f => `<div class="note-network-node"><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div>`).join('');
    return `<div class="note-tool-block note-network"><h3>${escapeHtml(title)}</h3>
      ${center ? `<div class="note-network-center"><b>${escapeHtml(center.label)}</b><p>${esc(center.value)}</p></div>` : ''}
      <div class="note-network-orbit">${nodes}</div>
    </div><p><br></p>`;
  }
  if (layout === 'matrix') {
    const items = fields.map(f => `<div class="note-matrix-row"><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div>`).join('');
    return `<div class="note-tool-block note-matrix"><h3>${escapeHtml(title)}</h3>${items}</div><p><br></p>`;
  }
  if (layout === 'cards') {
    const cards = fields.map((f, i) => `<div class="note-tool-card"><span class="note-card-num">${i + 1}</span><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div>`).join('');
    return `<div class="note-tool-block note-cards"><h3>${escapeHtml(title)}</h3><div class="note-cards-grid">${cards}</div></div><p><br></p>`;
  }
  if (layout === 'coding') {
    const steps = fields.map((f, i) => `<div class="note-coding-step"><span>${i + 1}</span><div><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div></div>`).join('');
    return `<div class="note-tool-block note-coding"><h3>${escapeHtml(title)}</h3>${steps}</div><p><br></p>`;
  }
  if (layout === 'legal') {
    const items = fields.map(f => `<div class="note-legal-row"><span class="note-legal-mark">§</span><div><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div></div>`).join('');
    return `<div class="note-tool-block note-legal"><h3>${escapeHtml(title)}</h3>${items}</div><p><br></p>`;
  }
  if (layout === 'case') {
    const items = fields.map((f, i) => `<div class="note-case-row"><span>${['+', '◎', '→', 'Rx', '✓'][i] || '·'}</span><div><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div></div>`).join('');
    return `<div class="note-tool-block note-case"><h3>${escapeHtml(title)}</h3>${items}</div><p><br></p>`;
  }
  if (layout === 'math') {
    const items = fields.map(f => `<div class="note-math-row"><b>${escapeHtml(f.label)}</b><p class="math-line">${esc(f.value)}</p></div>`).join('');
    return `<div class="note-tool-block note-math"><h3>${escapeHtml(title)}</h3>${items}</div><p><br></p>`;
  }
  if (layout === 'music') {
    const items = fields.map(f => `<div class="note-music-row"><span>♪</span><div><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div></div>`).join('');
    return `<div class="note-tool-block note-music"><h3>${escapeHtml(title)}</h3>${items}</div><p><br></p>`;
  }
  if (layout === 'experiment') {
    const items = fields.map((f, i) => `<div class="note-experiment-row"><span>${i + 1}</span><div><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div></div>`).join('');
    return `<div class="note-tool-block note-experiment"><h3>${escapeHtml(title)}</h3>${items}</div><p><br></p>`;
  }
  if (layout === 'vocab') {
    const items = fields.map(f => `<div class="note-vocab-row"><b>${escapeHtml(f.label)}</b><p>${esc(f.value)}</p></div>`).join('');
    return `<div class="note-tool-block note-vocab"><h3>${escapeHtml(title)}</h3>${items}</div><p><br></p>`;
  }
  if (layout === 'reading' || layout === 'source' || layout === 'evidence' || layout === 'review' || layout === 'reflection' || layout === 'survey') {
    return `<div class="note-tool-block note-${layout}"><h3>${escapeHtml(title)}</h3>${rows}</div><p><br></p>`;
  }
  return `<div class="note-tool-block note-enhanced"><h3>${escapeHtml(title)}</h3>${rows}</div><p><br></p>`;
}

function renderSavedReferencesList(container, onSelect) {
  const refs = loadSavedReferences();
  if (!refs.length) {
    container.innerHTML = '<p class="saved-refs-empty">Ingen gemte referencer endnu. Udfyld formularen og klik »Gem reference«.</p>';
    return;
  }
  container.innerHTML = refs.slice(0, 12).map(ref => `
    <article class="saved-ref-card" data-ref-id="${ref.id}">
      <div class="saved-ref-copy"><b>${escapeHtml(ref.author || 'Ukendt')}</b><span>${escapeHtml((ref.title || '').slice(0, 72))}${(ref.title || '').length > 72 ? '…' : ''}</span><small>${escapeHtml(ref.year || '')}${ref.publisher ? ` · ${escapeHtml(ref.publisher.slice(0, 40))}` : ''}</small></div>
      <div class="saved-ref-actions">
        <button type="button" class="btn-outline btn-sm" data-insert-ref="${ref.id}">Indsæt</button>
        <button type="button" class="btn-outline btn-sm" data-fill-ref="${ref.id}">Rediger</button>
        <button type="button" class="btn-outline btn-sm danger" data-delete-ref="${ref.id}">×</button>
      </div>
    </article>`).join('');
  container.querySelectorAll('[data-insert-ref]').forEach(btn => btn.addEventListener('click', () => {
    const ref = loadSavedReferences().find(r => r.id === btn.dataset.insertRef);
    if (!ref) return;
    const html = `<div class="note-tool-block note-reference"><h3>Reference</h3><p class="note-ref-intext">${escapeHtml(formatInTextCitation(ref))}</p><p class="note-ref-full">${escapeHtml(formatReferenceCitation(ref))}</p></div><p><br></p>`;
    insertHtml(html);
  }));
  container.querySelectorAll('[data-fill-ref]').forEach(btn => btn.addEventListener('click', () => {
    const ref = loadSavedReferences().find(r => r.id === btn.dataset.fillRef);
    if (!ref || !onSelect) return;
    onSelect(ref);
  }));
  container.querySelectorAll('[data-delete-ref]').forEach(btn => btn.addEventListener('click', () => {
    deleteReferenceEntry(btn.dataset.deleteRef);
    renderSavedReferencesList(container, onSelect);
  }));
}

function openBibliographyTool(tool = 'bibliography', packId = 'general') {
  captureEditorRange();
  let dialog = $('#bibliographyToolDialog');
  const isLegal = tool === 'legalCitation';
  const title = isLegal ? 'Juridiske henvisninger' : 'Referencer';
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'bibliographyToolDialog';
    dialog.className = 'university-tool-dialog bibliography-tool-dialog';
    dialog.innerHTML = `<div class="modal">
      <div class="modal-head"><div><span class="engineering-tag" id="bibToolCategory">REFERENCER</span><h2 id="bibToolTitle">Referencer</h2></div><button type="button" class="modal-close" data-bib-close>×</button></div>
      <div class="bibliography-tool-body">
        <section class="bibliography-form-panel">
          <div class="university-tool-intro"><p>Byg en korrekt reference og gem den til hurtig genbrug i alle dine noter.</p><small>Vælg kildetype og citationsstil — forhåndsvisningen opdateres live.</small></div>
          <div class="bibliography-controls">
            <label class="bib-control"><span>Kildetype</span><select id="bibSourceType"><option value="book">Bog</option><option value="article">Artikel</option><option value="chapter">Kapitel</option><option value="website">Website</option><option value="thesis">Afhandling</option><option value="report">Rapport</option></select></label>
            <label class="bib-control"><span>Citationsstil</span><select id="bibCitationStyle"><option value="apa">APA 7</option><option value="harvard">Harvard</option><option value="vancouver">Vancouver</option><option value="legal">Juridisk</option></select></label>
          </div>
          <div class="bibliography-fields" id="bibFields"></div>
          <div class="bibliography-preview"><span>Forhåndsvisning</span><p id="bibPreview">Udfyld felterne for at se den formaterede reference.</p><p id="bibInText" class="bib-intext"></p></div>
        </section>
        <aside class="bibliography-saved-panel">
          <div class="saved-refs-head"><b>Gemte referencer</b><small>Klik Indsæt for at sætte ind i noten</small></div>
          <div class="saved-refs-list" id="bibSavedList"></div>
        </aside>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-outline" data-bib-close>Annuller</button>
        <button type="button" class="btn-outline" id="bibSaveRef">Gem reference</button>
        <button type="button" class="btn-primary" id="bibInsertRef">Indsæt i noter</button>
      </div>
    </div>`;
    document.body.appendChild(dialog);
    $('#bibSourceType')?.addEventListener('change', () => { renderBibliographyFields(); updateBibliographyPreview(); });
    $('#bibCitationStyle')?.addEventListener('change', updateBibliographyPreview);
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-bib-close]')) { dialog.close(); return; }
      if (event.target.closest('#bibSaveRef')) {
        const ref = readBibliographyForm();
        if (!ref.title && !ref.author) return alert('Udfyld mindst forfatter og titel.');
        saveReferenceEntry(ref);
        renderSavedReferencesList($('#bibSavedList'), fillBibliographyForm);
        $('#bibSaveRef').textContent = 'Gemt ✓';
        setTimeout(() => { $('#bibSaveRef').textContent = 'Gem reference'; }, 1200);
        return;
      }
      if (!event.target.closest('#bibInsertRef')) return;
      const ref = readBibliographyForm();
      if (!ref.title && !ref.author) return alert('Udfyld mindst forfatter og titel.');
      saveReferenceEntry(ref);
      const html = `<div class="note-tool-block note-reference"><h3>${escapeHtml(title)}</h3><p class="note-ref-intext">${escapeHtml(formatInTextCitation(ref))}</p><p class="note-ref-full">${escapeHtml(formatReferenceCitation(ref))}</p></div><p><br></p>`;
      dialog.close();
      setTimeout(() => insertHtml(html), 50);
    });
  }
  dialog.dataset.tool = tool;
  dialog.dataset.pack = packId;
  $('#bibToolTitle').textContent = title;
  $('#bibToolCategory').textContent = (toolPacks[packId]?.label || 'Universitetsværktøjer').toUpperCase();
  if (isLegal) $('#bibCitationStyle').value = 'legal';
  renderBibliographyFields();
  fillBibliographyForm({});
  renderSavedReferencesList($('#bibSavedList'), fillBibliographyForm);
  dialog.showModal();
}

function renderBibliographyFields() {
  const type = $('#bibSourceType')?.value || 'book';
  const fieldMap = {
    book: [['author', 'Forfatter(e)'], ['title', 'Titel'], ['year', 'År'], ['publisher', 'Forlag'], ['doi', 'DOI eller URL'], ['pages', 'Side(r)']],
    article: [['author', 'Forfatter(e)'], ['title', 'Artikeltitel'], ['year', 'År'], ['journal', 'Tidsskrift'], ['volume', 'Bind'], ['issue', 'Nummer'], ['pages', 'Side(r)'], ['doi', 'DOI']],
    chapter: [['author', 'Kapitelforfatter'], ['title', 'Kapiteltitel'], ['year', 'År'], ['publisher', 'Bog / redaktør'], ['pages', 'Side(r) i bog'], ['doi', 'DOI eller URL']],
    website: [['author', 'Forfatter / organisation'], ['title', 'Sidetitel'], ['year', 'År / dato'], ['publisher', 'Website'], ['url', 'URL'], ['note', 'Hentet dato']],
    thesis: [['author', 'Forfatter'], ['title', 'Titel'], ['year', 'År'], ['publisher', 'Institution'], ['doi', 'DOI eller URL']],
    report: [['author', 'Udgiver'], ['title', 'Rapporttitel'], ['year', 'År'], ['publisher', 'Organisation'], ['doi', 'DOI eller URL']],
  };
  const fields = fieldMap[type] || fieldMap.book;
  const host = $('#bibFields');
  if (!host) return;
  host.innerHTML = fields.map(([key, label]) => `<label class="university-tool-field"><span>${escapeHtml(label)}</span><input type="text" data-bib-field="${key}" placeholder="${escapeHtml({ author: 'Fx Hansen, A. & Jensen, B.', title: 'Fx Titel på værk', year: 'Fx 2025', publisher: 'Fx forlag eller universitet', doi: 'Fx https://doi.org/…', pages: 'Fx 45–67', journal: 'Fx Journal of…', volume: 'Fx 12', issue: 'Fx 3', url: 'Fx https://…', note: 'Fx hentet 15.06.2026' }[key] || '')}"></label>`).join('');
  host.querySelectorAll('[data-bib-field]').forEach(input => input.addEventListener('input', updateBibliographyPreview));
}

function readBibliographyForm() {
  const ref = { type: $('#bibSourceType')?.value || 'book', style: $('#bibCitationStyle')?.value || 'apa', id: $('#bibliographyToolDialog')?.dataset.editingId || '' };
  $('#bibFields')?.querySelectorAll('[data-bib-field]').forEach(input => { ref[input.dataset.bibField] = input.value.trim(); });
  if (ref.doi && !ref.url) ref.url = ref.doi;
  return ref;
}

function fillBibliographyForm(ref = {}) {
  const dialog = $('#bibliographyToolDialog');
  if (dialog) dialog.dataset.editingId = ref.id || '';
  if ($('#bibSourceType') && ref.type) $('#bibSourceType').value = ref.type;
  renderBibliographyFields();
  if ($('#bibCitationStyle') && ref.style) $('#bibCitationStyle').value = ref.style;
  $('#bibFields')?.querySelectorAll('[data-bib-field]').forEach(input => {
    const key = input.dataset.bibField;
    if (ref[key]) input.value = ref[key];
  });
  updateBibliographyPreview();
}

function updateBibliographyPreview() {
  const ref = readBibliographyForm();
  const preview = $('#bibPreview');
  const intext = $('#bibInText');
  if (!preview) return;
  if (!ref.author && !ref.title) {
    preview.textContent = 'Udfyld felterne for at se den formaterede reference.';
    if (intext) intext.textContent = '';
    return;
  }
  preview.textContent = formatReferenceCitation(ref);
  if (intext) intext.textContent = `I teksten: ${formatInTextCitation(ref)}`;
}

function resetUniversityToolDialog() {
  universityToolAbort?.abort();
  universityToolAbort = null;
  const dialog = $('#universityToolDialog');
  if (!dialog) return;
  dialog.dataset.generated = '';
  const result = $('#universityToolResult');
  if (result) {
    result.hidden = true;
    result.innerHTML = '';
    result.className = 'university-tool-result';
  }
  $('#universityToolFields')?.querySelectorAll('[data-university-tool-field]').forEach(field => { field.value = ''; });
}

function closeUniversityToolDialog() {
  resetUniversityToolDialog();
  $('#universityToolDialog')?.close();
}

function openUniversityToolDialog(tool, title, sections, packId) {
  captureEditorRange();
  let dialog = $('#universityToolDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'universityToolDialog';
    dialog.className = 'university-tool-dialog';
    dialog.innerHTML = `<div class="modal">
      <div class="modal-head"><div><span class="engineering-tag" id="universityToolCategory">STUDIEVÆRKTØJ</span><h2 id="universityToolTitle">Værktøj</h2></div><button type="button" class="modal-close" data-university-tool-close>×</button></div>
      <div class="university-tool-toolbar" id="universityToolToolbar">
        <button type="button" class="btn-outline btn-sm" id="fillUniversityToolExample">Udfyld eksempel</button>
        <small id="universityToolHint">Udfyld felterne — eller brug AI til at bearbejde og kontrollere.</small>
      </div>
      <div class="university-tool-scroll">
        <div class="university-tool-fields" id="universityToolFields"></div>
        <div class="university-tool-result" id="universityToolResult" hidden></div>
      </div>
      <div class="modal-actions"><button type="button" class="btn-outline" data-university-tool-close>Annuller</button><button type="button" class="btn-outline" id="buildUniversityToolResult">Bearbejd og kontrollér</button><button type="button" class="btn-primary" id="insertUniversityToolResult">Indsæt i noter</button></div>
    </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('close', resetUniversityToolDialog);
    dialog.addEventListener('cancel', resetUniversityToolDialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) { closeUniversityToolDialog(); return; }
      if (event.target.closest('[data-university-tool-close]')) { closeUniversityToolDialog(); return; }
      if (event.target.closest('#fillUniversityToolExample')) { fillUniversityToolExample(dialog); return; }
      if (event.target.closest('#buildUniversityToolResult')) {
        const fields = collectUniversityToolFields(dialog);
        const source = fields.map(field => `${field.label}:\n${field.value}`).join('\n\n');
        const result = $('#universityToolResult');
        result.hidden = false;
        showAiLoading(result, 'Bearbejder værktøjet…');
        universityToolAbort?.abort();
        universityToolAbort = new AbortController();
        callAI(
          universityToolAiPrompt(dialog.dataset.tool, dialog.dataset.pack, dialog.dataset.title),
          source,
          { signal: universityToolAbort.signal },
        ).then(text => {
          if (!dialog.open) return;
          dialog.dataset.generated = text;
          result.hidden = false;
          result.className = 'university-tool-result visible';
          result.innerHTML = `<strong>Færdigt resultat</strong>${simpleMarkdownToHtml(text)}`;
        }).catch(error => {
          if (!dialog.open || error?.name === 'AbortError') return;
          result.hidden = false;
          result.className = 'university-tool-result visible error';
          result.textContent = error.message;
        });
        return;
      }
      if (!event.target.closest('#insertUniversityToolResult')) return;
      if (dialog.dataset.generated) {
        const html = `<h2>${escapeHtml(dialog.dataset.title)}</h2>${simpleMarkdownToHtml(dialog.dataset.generated)}<p><br></p>`;
        closeUniversityToolDialog();
        setTimeout(() => insertHtml(html), 50);
        return;
      }
      const fields = collectUniversityToolFields(dialog);
      const html = dialog.dataset.generated
        ? `<h2>${escapeHtml(dialog.dataset.title)}</h2>${simpleMarkdownToHtml(dialog.dataset.generated)}<p><br></p>`
        : buildUniversityToolHtml(dialog.dataset.tool, dialog.dataset.title, fields, dialog.dataset.pack);
      closeUniversityToolDialog();
      setTimeout(() => insertHtml(html), 50);
    });
  }
  dialog.dataset.tool = tool;
  dialog.dataset.title = title;
  dialog.dataset.pack = packId || 'general';
  dialog.dataset.generated = '';
  $('#universityToolTitle').textContent = title;
  $('#universityToolCategory').textContent = (toolPacks[packId]?.label || 'Studieværktøj').toUpperCase();
  const fieldsHost = $('#universityToolFields');
  const fieldsHtml = renderUniversityToolFields(tool, sections, packId || 'general', title);
  if (tool === 'quote') {
    fieldsHost.innerHTML = `<div class="quote-tool-body"><div class="quote-tool-form">${fieldsHtml}</div><aside class="quote-tool-refs"><div class="saved-refs-head"><b>Gemte referencer</b><small>Klik »Brug kilde« for at udfylde kildefeltet</small></div><div class="saved-refs-list" id="quoteSavedRefs"></div></aside></div>`;
    renderQuoteSavedRefs($('#quoteSavedRefs'), fieldsHost);
  } else {
    fieldsHost.innerHTML = fieldsHtml;
  }
  const hint = $('#universityToolHint');
  if (hint) hint.textContent = getUniversityToolUi(tool, packId).tips || 'Udfyld felterne — eller brug AI til at bearbejde og kontrollere.';
  const generated = $('#universityToolResult');
  if (generated) { generated.hidden = true; generated.innerHTML = ''; }
  dialog.showModal();
}

function renderQuoteSavedRefs(container, fieldsHost) {
  if (!container) return;
  const refs = loadSavedReferences();
  if (!refs.length) {
    container.innerHTML = '<p class="saved-refs-empty">Ingen gemte referencer. Opret dem via Referencer-værktøjet.</p>';
    return;
  }
  container.innerHTML = refs.slice(0, 10).map(ref => `
    <article class="saved-ref-card" data-ref-id="${ref.id}">
      <div class="saved-ref-copy"><b>${escapeHtml(ref.author || 'Ukendt')}</b><span>${escapeHtml((ref.title || '').slice(0, 60))}${(ref.title || '').length > 60 ? '…' : ''}</span><small>${escapeHtml(ref.year || '')}${ref.pages ? ` · s. ${escapeHtml(ref.pages)}` : ''}</small></div>
      <div class="saved-ref-actions"><button type="button" class="btn-outline btn-sm" data-use-quote-ref="${ref.id}">Brug kilde</button></div>
    </article>`).join('');
  container.querySelectorAll('[data-use-quote-ref]').forEach(btn => btn.addEventListener('click', () => {
    const ref = loadSavedReferences().find(r => r.id === btn.dataset.useQuoteRef);
    if (!ref) return;
    const sourceField = [...fieldsHost.querySelectorAll('[data-university-tool-field]')].find(field => /kilde/i.test(field.dataset.label || ''));
    if (sourceField) {
      const citation = `${formatInTextCitation(ref)} — ${formatReferenceCitation(ref)}`;
      sourceField.value = citation;
      sourceField.focus();
    }
  }));
}

function insertUniversityTool(tool) {
  if (tool === 'equationSolver') {
    openEquationSolver();
    return;
  }
  if (tool === 'bibliography' || tool === 'legalCitation') {
    const packEntry = Object.entries(toolPacks).find(([, pack]) => {
      if (pack.tools?.some(([key]) => key === tool)) return true;
      return (pack.groups || []).some(group => group.tools.some(([key]) => key === tool));
    });
    openBibliographyTool(tool, packEntry?.[0] || 'general');
    return true;
  }
  if (tool === 'quote') {
    const packEntry = Object.entries(toolPacks).find(([, pack]) => pack.tools?.some(([key]) => key === tool) || (pack.groups || []).some(g => g.tools.some(([key]) => key === tool)));
    openUniversityToolDialog(tool, 'Citat', ['Citat', 'Kilde og side', 'Kontekst', 'Betydning', 'Din kommentar'], packEntry?.[0] || 'general');
    return true;
  }
  const templates = {
    epsilonDelta: ['Epsilon og delta', ['Definition: ∀ε > 0 findes δ > 0', 'Valg af δ som funktion af ε', 'Ulighedskæde', 'Konklusion']],
    summation: ['Sigma, rækker og følger', ['Σ notation og indeks', 'Konvergenskriterium', 'Partialsum', 'Grænseværdi', 'Resultat']],
    quantumMechanics: ['Kvantemekanik', ['Tilstand |ψ⟩ og Hilbertrum', 'Operator Â og egenværdier', 'Schrödingerligningen iℏ∂|ψ⟩/∂t = Ĥ|ψ⟩', 'Måling og forventningsværdi ⟨Â⟩', 'Usikkerhedsrelation ΔxΔp ≥ ℏ/2']],
    quantumPhysics: ['Kvantfysik', ['Plancks relation E = hν', 'De Broglie λ = h/p', 'Bølgefunktion og sandsynlighed |ψ|²', 'Potentiale og energiniveauer', 'Fortolkning og grænsetilfælde']],
    calculus: ['Calculus', ['Definitioner og antagelser', 'Grænseværdi og kontinuitet', 'Differentiation', 'Integration', 'Anvendelse']],
    linearAlgebra: ['Lineær algebra', ['Vektorrum og basis', 'Lineær transformation', 'Matrixrepræsentation', 'Egenværdier og egenvektorer', 'Resultat']],
    differentialEquations: ['Differentialligninger', ['Model og begyndelsesbetingelser', 'Ligningstype', 'Løsningsmetode', 'Stabilitet', 'Fortolkning']],
    analysis: ['Real analyse', ['Definition eller sætning', 'Forudsætninger', 'Bevisidé', 'Detaljer', 'Konsekvens']],
    complexAnalysis: ['Kompleks analyse', ['Holomorfi', 'Konturintegral', 'Singulariteter', 'Residuer', 'Anvendelse']],
    probability: ['Sandsynlighed', ['Udfaldsrum', 'Tilfældige variable', 'Fordeling', 'Forventning og varians', 'Konklusion']],
    numericalMethods: ['Numeriske metoder', ['Problem', 'Algoritme', 'Fejl og konvergens', 'Stabilitet', 'Resultat']],
    optimization: ['Optimering', ['Målfunktion', 'Begrænsninger', 'Optimalitetsbetingelser', 'Metode', 'Løsning og følsomhed']],
    geometry: ['Geometri', ['Objekter og rum', 'Koordinater', 'Transformationer', 'Invarianter', 'Konklusion']],
    topology: ['Topologi', ['Rum og topologi', 'Åbne og lukkede mængder', 'Kontinuitet', 'Kompakthed og sammenhæng', 'Bevis']],
    discreteMath: ['Diskret matematik', ['Mængder og relationer', 'Kombinatorik', 'Grafer', 'Rekursion', 'Bevis']],
    numberTheory: ['Talteori', ['Kongruenser', 'Primtal og faktorisering', 'Diofantiske ligninger', 'Metode', 'Bevis']],
    logic: ['Logik og beviser', ['Påstand', 'Kvantorer og definitioner', 'Bevisstrategi', 'Bevis', 'Mod-eksempel']],
    sourceAnalysis: ['Kildeanalyse', ['Afsender og kontekst', 'Formål og målgruppe', 'Tendens og troværdighed', 'Centrale citater', 'Vurdering']],
    argument: ['Argumentkort', ['Påstand', 'Belæg', 'Hjemmel', 'Modargument', 'Konklusion']],
    timeline: ['Tidslinje', ['Periode eller dato', 'Begivenhed', 'Betydning', 'Sammenhæng']],
    closeReading: ['Nærlæsning', ['Tekststed', 'Sprog og virkemidler', 'Fortolkning', 'Dokumentation']],
    bibliography: ['Referencer', ['Forfatter', 'Titel', 'År', 'Forlag eller tidsskrift', 'DOI eller URL']],
    swot: ['SWOT-analyse', ['Styrker', 'Svagheder', 'Muligheder', 'Trusler']],
    accounting: ['Regnskabsanalyse', ['Omsætning', 'Omkostninger', 'Resultat', 'Balance', 'Nøgletal og fortolkning']],
    demandSupply: ['Udbud og efterspørgsel', ['Marked', 'Efterspørgselsfaktorer', 'Udbudsfaktorer', 'Ligevægt', 'Konsekvens']],
    vocabulary: ['Ordforråd', ['Ord eller udtryk', 'Betydning', 'Bøjning', 'Eksempel', 'Oversættelse']],
    translation: ['Oversættelsesarbejde', ['Originaltekst', 'Oversættelse', 'Valg og nuancer', 'Alternativer']],
    grammar: ['Grammatikanalyse', ['Sætning', 'Ordklasse', 'Syntaks', 'Bøjning', 'Forklaring']],
    caseStudy: ['Casestudie', ['Case og kontekst', 'Problemstilling', 'Teori', 'Empiri', 'Analyse', 'Konklusion']],
    interview: ['Interviewguide', ['Forskningsspørgsmål', 'Indledning', 'Hovedspørgsmål', 'Opfølgning', 'Etik']],
    survey: ['Spørgeskema', ['Formål', 'Målgruppe', 'Variable', 'Spørgsmål', 'Svarskala']],
    patientCase: ['Patientcase', ['Anamnese', 'Observationer', 'Problem', 'Intervention', 'Evaluering']],
    anatomy: ['Anatomi og funktion', ['Struktur', 'Placering', 'Funktion', 'Relationer', 'Klinisk betydning']],
    dosage: ['Doseringsnotat', ['Præparat', 'Styrke', 'Ordination', 'Beregning', 'Kontrol']],
    evidence: ['Evidensvurdering', ['Forskningsspørgsmål', 'Studiedesign', 'Population', 'Resultat', 'Bias', 'Anvendelighed']],
    legislation: ['Lovbestemmelse', ['Retskilde', 'Paragraf', 'Betingelser', 'Retsfølge', 'Fortolkning']],
    caseLaw: ['Domsanalyse', ['Faktum', 'Juridisk spørgsmål', 'Parternes argumenter', 'Begrundelse', 'Resultat', 'Præjudikatværdi']],
    legalMethod: ['Juridisk metode', ['Problem', 'Retskilder', 'Fortolkning', 'Anvendelse på faktum', 'Konklusion']],
    discourse: ['Diskursanalyse', ['Materiale', 'Centrale begreber', 'Positioner', 'Magt og kontekst', 'Fortolkning']],
    hermeneutics: ['Hermeneutisk analyse', ['Forforståelse', 'Del og helhed', 'Fortolkning', 'Dokumentation', 'Refleksion']],
    theoryCompare: ['Teorisammenligning', ['Teori A', 'Teori B', 'Ligheder', 'Forskelle', 'Anvendelighed']],
    qualitativeCoding: ['Kvalitativ kodning', ['Datastykke', 'Åben kode', 'Kategori', 'Tema', 'Analytisk memo']],
    researchDesign: ['Forskningsdesign', ['Problemformulering', 'Design', 'Data', 'Analyse', 'Validitet og etik']],
    literatureReview: ['Litteraturreview', ['Søgestrategi', 'Udvælgelse', 'Temaer', 'Uenigheder', 'Forskningshul']],
    econometrics: ['Økonometri', ['Model', 'Variable', 'Antagelser', 'Estimation', 'Diagnostik og fortolkning']],
    finance: ['Finansiering', ['Cash flow', 'Diskonteringsrente', 'Nutidsværdi', 'Risiko', 'Beslutning']],
    clinicalReasoning: ['Klinisk ræsonnering', ['Fund', 'Hypoteser', 'Differentialdiagnoser', 'Undersøgelser', 'Plan']],
    epidemiology: ['Epidemiologi', ['Population', 'Eksponering', 'Outcome', 'Effektmål', 'Bias og konfounding']],
    legalIssue: ['Juridisk problem', ['Faktum', 'Retligt spørgsmål', 'Regel', 'Anvendelse', 'Konklusion']],
    counterpoint: ['Kontrapunkt', ['Tema A', 'Tema B', 'Stemmer', 'Regler og parallelle', 'Analyse']],
    orchestration: ['Instrumentation', ['Ensemble', 'Stemmer og roller', 'Klangfarver', 'Dynamik og artikulation', 'Begrundelse']],
    mechanics: ['Mekanik', ['System og antagelser', 'Kræfter og diagram', 'Ligninger', 'Udregning', 'Fortolkning']],
    experimentDesign: ['Eksperimentdesign', ['Forskningsspørgsmål og hypotese', 'Uafhængige og afhængige variable', 'Design og kontrolgruppe', 'Operationalisering og måling', 'Validitet og etik']],
    psychometrics: ['Psykometri', ['Konstrukt og skala', 'Pålidelighed', 'Validitet', 'Dataindsamling', 'Fortolkning']],
    theoryApply: ['Teorianvendelse', ['Teori og begreber', 'Empiri eller case', 'Anvendelse trin for trin', 'Styrker og begrænsninger', 'Konklusion']],
    brainMap: ['Hjerne-model', ['Hovedstruktur', 'Lap og funktion', 'Neural proces', 'Eksempel fra pensum', 'Klinisk eller adfærdsmæssig betydning']],
    memoryModel: ['Hukommelsesmodel', ['Indgang og stimulus', 'Korttidshukommelse', 'Kodning og lagring', 'Genkaldelse', 'Anvendelse i dit emne']],
    cognition: ['Kognitiv proces', ['Stimulus og perception', 'Opmærksomhed og selektion', 'Beslutning', 'Handling', 'Feedback']],
    robotFlow: ['Robot-flow', ['Sensorinput', 'Perception og kortlægning', 'Planlægning og beslutning', 'Styring og aktuatorer', 'Feedback og fejlhåndtering']],
    conceptMap: ['Begrebskort', ['Centralt begreb', 'Underbegreb 1', 'Underbegreb 2', 'Relationer', 'Eksempel fra pensum']],
    peerReview: ['Peer review', ['Tekst eller projekt', 'Styrker', 'Svagheder', 'Forslag til forbedring', 'Samlet vurdering']],
    reflectionLog: ['Refleksionslog', ['Situation eller oplevelse', 'Observation', 'Analyse', 'Læring', 'Næste skridt']],
    systematicReview: ['Systematisk review', ['Forskningsspørgsmål', 'Søgestrategi', 'Inklusion/eksklusion', 'Kvalitetsvurdering', 'Syntese']],
    metaAnalysis: ['Metaanalyse', ['Inkluderede studier', 'Effektstørrelse', 'Heterogenitet', 'Bias', 'Konklusion']],
    hypothesisTest: ['Hypotesetest', ['Nulhypotese H₀', 'Alternativ H₁', 'Teststørrelse', 'p-værdi', 'Fortolkning']],
    userStory: ['User story', ['Som bruger', 'Vil jeg', 'Så jeg kan', 'Acceptkriterier', 'Prioritet']],
    apiDesign: ['API-design', ['Endpoint', 'Request/response', 'Autentifikation', 'Fejlhåndtering', 'Versionering']],
    sprintPlanning: ['Sprintplan', ['Sprintmål', 'Backlog-items', 'Estimat', 'Ansvarlig', 'Definition of done']],
    clinicalPathway: ['Klinisk forløb', ['Indikation', 'Undersøgelser', 'Behandling', 'Opfølgning', 'Kvalitetsmål']],
    drugInteraction: ['Lægemiddelinteraktion', ['Præparat A', 'Præparat B', 'Mekanisme', 'Klinisk betydning', 'Handling']],
    caseSeries: ['Caseserie', ['Patientpopulation', 'Fælles fund', 'Diagnose', 'Behandling', 'Læring']],
    focusGroup: ['Fokusgruppe', ['Formål', 'Deltagere', 'Moderatorguide', 'Temaer', 'Analyse']],
    observationalStudy: ['Observationsstudie', ['Design', 'Population', 'Eksponering', 'Outcome', 'Bias og konklusion']],
    policyBrief: ['Politiknotat', ['Problem', 'Nuværende situation', 'Anbefaling', 'Konsekvenser', 'Implementering']],
    debateMap: ['Debatkort', ['Påstand', 'Argument for', 'Argument imod', 'Modargument', 'Konklusion']],
    citationMap: ['Citatkort', ['Centralt emne eller forfatter', 'Primære værker', 'Relationer mellem værker', 'Centrale debatter', 'Dit citat og side']],
    quote: ['Citat', ['Citat', 'Kilde og side', 'Kontekst', 'Betydning', 'Din kommentar']],
    researchQuestion: ['Forskningsspørgsmål', ['Bredt emne', 'Afgrænsning', 'Præcist spørgsmål', 'Metode', 'Relevans']],
    archive: ['Arkivnoter', ['Arkivmateriale', 'Proveniens', 'Kontekst', 'Kildekritik', 'Noter']],
    regression: ['Regression', ['Afhængig variabel', 'Uafhængige variable', 'Model', 'Koefficienter', 'Fortolkning']],
    forecasting: ['Forecasting', ['Historiske data', 'Modelvalg', 'Prognose', 'Usikkerhed', 'Fortolkning']],
    valuation: ['Værdiansættelse', ['Cash flows', 'WACC', 'Terminalværdi', 'Enterprise value', 'Følsomhed']],
    gameTheory: ['Spilteori', ['Spillere', 'Strategier', 'Payoff-matrix', 'Nash-ligevægt', 'Analyse']],
    riskAnalysis: ['Risikoanalyse', ['Identificerede risici', 'Sandsynlighed', 'Konsekvens', 'Risikoscore', 'Tiltag']],
    phonetics: ['Fonetik', ['Lyd eller fonem', 'Artikulationssted', 'Transskription', 'Minimalpar', 'Eksempel']],
    syntax: ['Syntaks', ['Sætningsstruktur', 'Led og funktion', 'Trædiagram', 'Regel', 'Eksempel']],
    semantics: ['Semantik', ['Ord eller udtryk', 'Denotation', 'Konnotation', 'Kontekst', 'Fortolkning']],
    pragmatics: ['Pragmatik', ['Taleakt', 'Kontekst', 'Implicit mening', 'Høflighed', 'Eksempel']],
    corpus: ['Korpusanalyse', ['Korpus og størrelse', 'Søgeforespørgsel', 'Frekvens', 'Kollokationer', 'Fund']],
    precedent: ['Præjudikat', ['Tidligere dom', 'Retsprincip', 'Lighed med nuværende sag', 'Anvendelse', 'Konklusion']],
    contract: ['Kontraktanalyse', ['Kontraktparter', 'Aftaleindhold', 'Betingelser', 'Misligholdelse', 'Konsekvens']],
    euLaw: ['EU-ret', ['EU-retsakt', 'Dansk implementering', 'Primær/sekundær ret', 'Anvendelse', 'Konklusion']],
    humanRights: ['Menneskeret', ['EMRK artikel', 'Rettighed og indskrænkning', 'Proportionalitet', 'Praksis', 'Vurdering']],
    legalCitation: ['Juridiske henvisninger', ['Lovhenvisning', 'Domshenvisning', 'Litteratur', 'Korrekt format', 'Komplet reference']],
    caseComparison: ['Domssammenligning', ['Dom A', 'Dom B', 'Ligheder', 'Forskelle', 'Læring']],
    carePlan: ['Plejeplan', ['Patientbehov', 'Mål', 'Interventioner', 'Ansvar', 'Evaluering']],
    biostatistics: ['Biostatistik', ['Stikprøvestørrelse', 'Konfidensinterval', 'p-værdi', 'Effektstørrelse', 'Fortolkning']],
    pharmacology: ['Farmakologi', ['Lægemiddel og klasse', 'Virkningsmekanisme', 'Bivirkninger', 'Interaktioner', 'Dosering']],
    diagnostics: ['Diagnostik', ['Symptomer', 'Differentialdiagnoser', 'Test', 'Resultat', 'Plan']],
    networkAnalysis: ['Netværksanalyse', ['Netværk og noder', 'Kanter og vægt', 'Centralitet', 'Clustering', 'Fortolkning']],
    comparativeMethod: ['Komparativ metode', ['Cases der sammenlignes', 'Variable', 'Ligheder', 'Forskelle', 'Konklusion']],
    ethics: ['Forskningsetik', ['Etisk problem', 'Principper', 'Samtykke', 'Anonymisering', 'Konklusion']],
    formAnalysis: ['Formanalyse', ['Exposition', 'Development', 'Recapitulation', 'Temaer', 'Helhed']],
    composition: ['Kompositionsplan', ['Idé og stemning', 'Melodi', 'Harmoni', 'Arrangement', 'Gennemgang']],
    audioNotes: ['Lyttenoter', ['Lyttepunkt', 'Instrumentering', 'Dynamik', 'Form', 'Noter']],
    chords: ['Akkorder', ['Grundtone og type', 'Omvending', 'Progression', 'Funktion', 'Øvelse']],
    harmony: ['Harmonianalyse', ['Toneart og akkorder', 'Progression', 'Stemmeføring', 'Kadence', 'Analyse']],
    rhythm: ['Rytmeanalyse', ['Taktart og tempo', 'Synkoper', 'Rytmisk figur', 'Gentagelse', 'Øvelse']],
    earTraining: ['Hørelære', ['Interval', 'Akkordtype', 'Rytme', 'Melodilinje', 'Svar']],
    songAnalysis: ['Værkanalyse', ['Værk og komponist', 'Form og struktur', 'Temaer', 'Virkemidler', 'Fortolkning']],
    integral: ['Integral', ['Funktion f(x)', 'Grænser a og b', 'Stamfunktion F(x)', 'Udregning F(b)−F(a)', 'Fortolkning (areal, enhed)']],
    derivative: ['Differentiation', ['Funktion f(x)', 'Punkt eller interval', 'Differentiationsregel', 'f′(x) og mellemregning', 'Fortolkning (hældning, ekstremum)']],
    mechanics: ['Mekanik', ['System og antagelser', 'Kræfter og friløbsdiagram', 'Ligninger (F=ma osv.)', 'Udregning med enheder', 'Fortolkning']],
    angles: ['Vinkler og geometri', ['Figur og vinkeltype', 'Givne vinkler og længder', 'Sætning eller relation', 'Beregning', 'Resultat og begrundelse']],
    siUnits: ['SI-enheder', ['Størrelse og symbol', 'Oprindelig værdi og enhed', 'SI-enhed', 'Omregning', 'Enhedskontrol']],
    labReport: ['Laboratorienotat', ['Formål og hypotese', 'Materialer og opstilling', 'Metode', 'Data og beregninger', 'Resultat, fejlkilder og konklusion']],
    circuit: ['Kredsløb', ['Formål', 'Komponenter og værdier', 'Forsyning og forbindelser', 'Beregning (Ohms lov osv.)', 'Måling og kontrol']],
    calculator: ['Beregning', ['Udtryk eller formel', 'Kendte værdier', 'Mellemregning', 'Resultat', 'Kontrol og enheder']],
    python: ['Python-notat', ['Formål og problem', 'Input og output', 'Algoritme og logik', 'Implementering', 'Test og kompleksitet']],
    javascript: ['JavaScript-notat', ['Formål og problem', 'Input og output', 'Logik og struktur', 'Implementering', 'Test og edge cases']],
    java: ['Java-notat', ['Formål og klassestruktur', 'Input og output', 'Metoder og logik', 'Implementering', 'Test og undtagelser']],
    cpp: ['C/C++-notat', ['Formål og struktur', 'Input og output', 'Algoritme og hukommelse', 'Implementering', 'Test og performance']],
    go: ['Go-notat', ['Formål og pakker', 'Input og output', 'Goroutines og interfaces', 'Implementering', 'Test og fejlhåndtering']],
    rust: ['Rust-notat', ['Formål og ejerskab', 'Input og output', 'Typer og Result/Option', 'Implementering', 'Test og sikkerhed']],
    sql: ['SQL-notat', ['Formål og tabeller', 'Forespørgsel (SELECT/JOIN)', 'Filtrering og gruppering', 'Forventet output', 'Optimering og indeks']],
    web: ['Web-notat', ['Formål og struktur', 'HTML-semantik', 'CSS-layout', 'JavaScript-adfærd', 'Tilgængelighed og test']],
    matlab: ['MATLAB-notat', ['Problem og variable', 'Vektorer/matricer', 'Script eller funktion', 'Resultat og plot', 'Fortolkning']],
    arduino: ['Arduino-notat', ['Formål og hardware', 'Pinout og sensorer', 'Setup og loop', 'Output og timing', 'Test og fejlsøgning']],
    ros: ['ROS-notat', ['Noder og formål', 'Topics og services', 'Publish/subscribe', 'Koordinatsystem', 'Test og launch']],
    debug: ['Fejlfinding', ['Symptom og fejlbesked', 'Fejlende kode', 'Hypotese om årsag', 'Rettet løsning', 'Hvorfor det virker']],
    libraries: ['Bibliotek og API', ['Bibliotek og version', 'Installation og afhængigheder', 'Vigtigste funktioner', 'Eksempelkode', 'Licens og dokumentation']],
    physics: ['Fysiknotat', ['Problem og givne størrelser', 'Teori og formler', 'Udregning med SI-enheder', 'Resultat', 'Fortolkning og kontrol']],
  };
  const packEntry = Object.entries(toolPacks).find(([, pack]) => {
    if (pack.tools?.some(([key]) => key === tool)) return true;
    return (pack.groups || []).some(group => group.tools.some(([key]) => key === tool));
  });
  const packId = packEntry?.[0];
  const toolLabel = packEntry?.[1]?.tools?.find(([key]) => key === tool)?.[1]
    || packEntry?.[1]?.groups?.flatMap(group => group.tools).find(([key]) => key === tool)?.[1];
  const categorySections = {
    general: ['Formål', 'Kilde eller input', 'Arbejde', 'Dokumentation', 'Konklusion'],
    stem: ['Problem og givne størrelser', 'Definitioner og formler', 'Udregning eller bevis', 'Enheder og kontrol', 'Fortolkning'],
    humanities: ['Materiale og kontekst', 'Begreber og teori', 'Tekstnær analyse', 'Modfortolkning', 'Konklusion og kilde'],
    economics: ['Problem og antagelser', 'Data og variable', 'Model eller beregning', 'Følsomhed og risiko', 'Beslutning'],
    languages: ['Original', 'Sproglig struktur', 'Betydning og nuance', 'Eksempel', 'Egen formulering'],
    social: ['Problemstilling', 'Teori og operationalisering', 'Empiri og metode', 'Analyse', 'Validitet og konklusion'],
    health: ['Problem og observationer', 'Fagligt grundlag', 'Vurdering', 'Handling og sikkerhedskontrol', 'Evaluering'],
    law: ['Faktum og retligt spørgsmål', 'Retskilder', 'Fortolkning', 'Anvendelse', 'Konklusion'],
    music: ['Værk eller passage', 'Notation og struktur', 'Harmonik eller rytme', 'Fortolkning', 'Øvepunkt'],
    coding: ['Formål og krav', 'Input og output', 'Implementering', 'Test og fejlsøgning', 'Kompleksitet og sikkerhed'],
    psychology: ['Fænomen eller adfærd', 'Teori og begreber', 'Metode og design', 'Resultat og fortolkning', 'Begrænsning og konklusion'],
  };
  if (!templates[tool] && !toolLabel) {
    console.error(`Ukendt værktøj: ${tool}`);
    alert('Værktøjet kunne ikke findes. Appen er ikke blevet ændret.');
    return false;
  }
  const [title, sections] = templates[tool] || [toolLabel, categorySections[packId] || categorySections.general];
  openUniversityToolDialog(tool, title, sections, packId);
  return true;
}

let lastPdfQuote = null;
let pdfSourceMode = 'file';
let pdfGeneratedHtml = '';
let workspaceReady = false;

const AI_PENCIL_SVG = `<svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="14" y="6" width="14" height="36" rx="3" fill="#7772a8"/>
  <rect x="14" y="6" width="14" height="8" rx="3" fill="#c8c4e0"/>
  <polygon points="14,42 28,42 21,52" fill="#f5c87a"/>
  <polygon points="14,42 28,42 21,47" fill="#e8a94a"/>
  <polygon points="19,47 23,47 21,52" fill="#2c2419"/>
  <rect x="16" y="10" width="3" height="28" rx="1.5" fill="#9490c0" opacity=".5"/>
</svg>`;

const TRASH_BIN_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M4 7h16" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
  <path d="M9.5 4.5h5L16 7H8l1.5-2.5z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
  <path d="M6.2 7l1.15 13.2a1.4 1.4 0 0 0 1.4 1.3h7.9a1.4 1.4 0 0 0 1.4-1.3L18.8 7" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
  <path d="M10 10.5v6.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
  <path d="M14 10.5v6.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
</svg>`;

function showAiLoading(el, label = 'Tænker…', dots = 0) {
  if (!el) return;
  const dotsHtml = dots > 1
    ? `<div class="pdf-page-dots">${Array.from({length: dots}, (_, i) => `<span id="pdfdot${i}"></span>`).join('')}</div>`
    : '';
  el.className = 'ai-result visible';
  el.innerHTML = `<div class="pdf-loading"><div class="pdf-pencil">${AI_PENCIL_SVG}</div><div class="pdf-loading-line"></div><div class="pdf-loading-label">${escapeHtml(label)}</div>${dotsHtml}</div>`;
}

function showEditorAiLoading(label = 'Retter tekst med AI…') {
  let overlay = $('#editorAiOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'editorAiOverlay';
    overlay.className = 'editor-ai-overlay';
    document.querySelector('.editor-workspace-stage')?.appendChild(overlay);
  }
  overlay.hidden = false;
  overlay.innerHTML = `<div class="pdf-loading"><div class="pdf-pencil">${AI_PENCIL_SVG}</div><div class="pdf-loading-line"></div><div class="pdf-loading-label">${escapeHtml(label)}</div></div>`;
}

function hideEditorAiLoading() {
  const overlay = $('#editorAiOverlay');
  if (overlay) {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }
}

function simpleMarkdownToHtml(markdown = '') {
  const safe = escapeHtml(markdown.trim());
  const lines = safe.split('\n');
  let html = '', list = '';
  const inline = value => value
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\((s\. [^)]+)\)/g, '<span class="pdf-page">($1)</span>');
  const closeList = () => { if (list) { html += `</${list}>`; list = ''; } };
  lines.forEach(line => {
    const value = line.trim();
    if (!value) { closeList(); return; }
    if (value.startsWith('### ')) { closeList(); html += `<h4>${inline(value.slice(4))}</h4>`; return; }
    if (value.startsWith('## ')) { closeList(); html += `<h3>${inline(value.slice(3))}</h3>`; return; }
    if (value.startsWith('# ')) { closeList(); html += `<h3>${inline(value.slice(2))}</h3>`; return; }
    if (/^[-*] /.test(value)) {
      if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; }
      html += `<li>${inline(value.slice(2))}</li>`; return;
    }
    if (/^\d+[.)] /.test(value)) {
      if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; }
      html += `<li>${inline(value.replace(/^\d+[.)] /, ''))}</li>`; return;
    }
    closeList();
    html += `<p>${inline(value)}</p>`;
  });
  closeList();
  return html;
}

function localPdfPageNotes(page, totalPages, topic) {
  const text = (page.text || '').replace(/\s+/g, ' ').trim();
  if (!text) return `## Side ${page.number}\n- (Ingen læsbar tekst på denne side)\n`;

  // Split into sentences, filter noise
  const raw = text.match(/[^.!?;]+[.!?;]+/g) || [text];
  const sentences = raw
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.length < 400)
    .filter(s => !/^\s*\d+\s*$/.test(s))
    .filter(s => !/^(side|page|kapitel|chapter|fig|figur|tabel)\s*\d/i.test(s));

  if (!sentences.length) return `## Side ${page.number}\n- (Ingen struktureret tekst fundet)\n`;

  // Score sentences by length and keyword proximity
  const topicWords = (topic || '').toLowerCase().split(/\s+/).filter(Boolean);
  const scored = sentences.map(s => {
    const lower = s.toLowerCase();
    const topicScore = topicWords.reduce((n, w) => n + (lower.includes(w) ? 3 : 0), 0);
    const lengthScore = Math.min(s.length / 80, 2);
    const defScore = /er en|er et|defineres|betyder|kaldes|beskrives|består af|handler om/i.test(s) ? 2 : 0;
    return { text: s, score: topicScore + lengthScore + defScore };
  }).sort((a, b) => b.score - a.score);

  const top = scored.slice(0, Math.min(10, scored.length));
  const mainIdea = top[0].text;
  const points = top.slice(1);

  // Separate definitions from regular points
  const defs = points.filter(s => /er en|er et|defineres|betyder|kaldes/i.test(s.text));
  const facts = points.filter(s => !defs.includes(s));

  let md = `## Side ${page.number}${totalPages > 1 ? ` af ${totalPages}` : ''}\n\n`;
  md += `**Hovedidé:** ${mainIdea}\n\n`;
  if (facts.length) {
    md += `**Centrale pointer:**\n`;
    facts.forEach(s => { md += `- ${s.text}\n`; });
    md += '\n';
  }
  if (defs.length) {
    md += `**Begreber:**\n`;
    defs.forEach(s => { md += `- ${s.text}\n`; });
    md += '\n';
  }
  return md;
}

async function extractLiteraturePdf(file) {
  const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  if (pdf.numPages > 30) throw new Error(`PDF'en har ${pdf.numPages} sider. Maks. 30 sider til eksamenstræning.`);
  const texts = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pg = await pdf.getPage(n);
    const content = await pg.getTextContent();
    texts.push(content.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim());
  }
  return { name: file.name, text: texts.join('\n'), pageCount: pdf.numPages };
}

function localPdfMaterial(pages, type, topic, classLevel) {
  const sentences = pages.flatMap(page => {
    const chunks = page.text.match(/[^.!?]+[.!?]+/g) || [page.text];
    return chunks.filter(s => s.trim().length > 24).slice(0, 4).map(text => ({ page: page.number, text: text.trim() }));
  }).slice(0, 12);
  const ref = item => item.page ? ` (s. ${item.page})` : '';
  if (!sentences.length) return '# Resultat\n- Der blev ikke fundet læsbar tekst.';
  if (type === 'flashcards') {
    return `# Flashcards\n${sentences.slice(0, 8).map((s, i) => `## Kort ${i + 1}\n- **Spørgsmål:** Hvad er hovedpointen i dette afsnit?${ref(s)}\n- **Svar:** ${s.text}${ref(s)}`).join('\n')}`;
  }
  if (type === 'quiz') {
    return `# Quiz\n${sentences.slice(0, 6).map((s, i) => `${i + 1}. Forklar med egne ord: ${s.text.slice(0, 90)}…${ref(s)}`).join('\n')}\n## Facit\n${sentences.slice(0, 6).map((s, i) => `${i + 1}. ${s.text}${ref(s)}`).join('\n')}`;
  }
  if (type === 'misconceptions') {
    return `# Mulige misforståelser\n${sentences.slice(0, 6).map(s => `- Kontrollér at du ikke forenkler dette udsagn for meget: ${s.text}${ref(s)}`).join('\n')}\n## Forståelsestjek\n- Kan du forklare begreberne uden at se i teksten?\n- Kan du knytte hvert udsagn til en formel eller et eksempel?`;
  }
  if (type === 'quote') {
    const words = (topic || '').toLowerCase().split(/\s+/).filter(Boolean);
    const ranked = sentences.map(s => ({ ...s, score: words.reduce((score, word) => score + (s.text.toLowerCase().includes(word) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
    const best = ranked[0];
    return `# Citat\n- “${best.text}”${ref(best)}`;
  }
  return `# Noter\n## Vigtige pointer\n${sentences.slice(0, 8).map(s => `- ${s.text}${ref(s)}`).join('\n')}\n## Kort opsummering\n${sentences.slice(0, 3).map(s => s.text).join(' ')}${pages[0]?.number ? ` (s. ${pages[0].number}${pages.length > 1 ? ` til ${pages[pages.length - 1].number}` : ''})` : ''}\n## Niveau\n- Tilpasset: ${classLevel}.`;
}

function pdfPageNotesPrompt(pageText, pageNum, totalPages, topic, classLevel, lang) {
  return `Du er et præcist noteværktøj. Din opgave er at omdanne denne sides rå tekst til kompakte, faglige studienoter.

TRIN 1 – RENS TEKSTEN:
- Ignorer sidehoveder, sidefødder, sidetal, kolonnenumre og gentagelser
- Saml brudte sætninger og ret uens mellemrum

TRIN 2 – IDENTIFICÉR INDHOLD:
Find og udtræk KUN:
- Hovedidé for siden
- Centrale pointer og argumenter
- Vigtige definitioner og begreber
- Nøglefakta, tal og beviser
- Konklusioner og sammenfatninger
${topic ? `- Særligt fokus på: ${topic}` : ''}

TRIN 3 – SKRIV NOTER:
Format (ren Markdown, ingen kodeblok):

## Side ${pageNum}${totalPages > 1 ? ` af ${totalPages}` : ''}

**Hovedidé:** [én sætning]

**Centrale pointer:**
- [punkt]
- [punkt]
- (så mange som nødvendigt – vær udtømmende)

**Begreber og definitioner:**
- **[begreb]:** [definition]

**Vigtige facts:**
- [fact]

REGLER:
- Skriv på ${lang || 'dansk'}, tilpasset ${classLevel}
- Brug KUN information fra denne sides tekst – gæt aldrig
- Bevare formler, symboler og enheder præcist
- Ingen fyldtekst, ingen gentagelser, ingen lange citater
- Høj informationsdensitet – korthed frem for alt

SIDETEKST:
${pageText}`;
}

function pdfPrompt(type, topic, classLevel, pages) {
  const typeRules = {
    flashcards: 'Lav 8 flashcards. Hvert kort skal have Spørgsmål og Svar.',
    quiz: 'Lav 6 faglige quizspørgsmål og et separat facit.',
    quote: `Find det mest præcise direkte citat om: ${topic || 'det centrale emne'}.`,
    misconceptions: 'Find sandsynlige misforståelser, forklar den korrekte forståelse og lav kontrolspørgsmål.',
  };
  const hasPages = pages.some(p => p.number);
  return `Du er en specialiseret universitetsassistent i Note'it.
${typeRules[type] || ''}

Regler:
- Skriv på ${activePage()?.language || 'dansk'} og tilpas til ${classLevel}.
- Brug kun information fra materialet. Gæt aldrig.
- Behold formler, symboler og enheder.
- ${hasPages ? 'Skriv sidetal efter HVER pointe i formatet (s. 1).' : 'Materialet er kopieret tekst, så tilføj ikke sidetal.'}
- Fokus: ${topic || 'hele materialet'}.
- Returnér ren Markdown uden kodeblok.

${pages.map(p => `${p.number ? `SIDE ${p.number}` : 'KOPIERET TEKST'}:\n${p.text}`).join('\n\n')}`;
}

function showImageInsertChoice(dataUrl, fileName = 'skærmbillede') {
  pendingPastedImage = { dataUrl, fileName };
  let dialog = $('#imageInsertDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'imageInsertDialog';
    dialog.className = 'image-choice-dialog';
    dialog.innerHTML = `<div class="modal">
      <div class="modal-head"><div><span class="engineering-tag">BILLEDE FRA BOG ELLER SKÆRM</span><h2>Hvad vil du gøre?</h2></div><button type="button" class="modal-close" data-image-choice="close">×</button></div>
      <img id="imageChoicePreview" alt="Forhåndsvisning">
      <div class="image-choice-actions">
        <button type="button" class="image-choice-card" data-image-choice="insert"><b>Indsæt billedet</b><span>Behold det præcis som det er i noten.</span></button>
        <button type="button" class="image-choice-card primary" data-image-choice="notes"><b>Lav om til noter</b><span>Udtræk pointer, begreber og struktur.</span></button>
      </div>
      <p class="hint">Du kan altid beholde originalen og tilføje noter under den.</p>
    </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', async event => {
      const choice = event.target.closest('[data-image-choice]')?.dataset.imageChoice;
      if (!choice) return;
      if (choice === 'close') { dialog.close(); return; }
      if (!pendingPastedImage || !$('#editor')) return;
      const imgData = pendingPastedImage;
      pendingPastedImage = null;
      if (choice === 'insert') {
        const imgHtml = `<figure class="source-image"><img src="${imgData.dataUrl}" alt="${escapeHtml(imgData.fileName)}"><figcaption>Kildebillede · tilføjet ${formatDate(new Date().toISOString())}</figcaption></figure><p><br></p>`;
        dialog.close();
        setTimeout(() => insertHtml(imgHtml), 50);
      } else {
        const result = await callImageAI(imgData.dataUrl);
        const aiImgHtml = `<section class="stem-block image-notes"><h4>Noter fra billede</h4>${simpleMarkdownToHtml(result)}<details><summary>Vis original</summary><img src="${imgData.dataUrl}" alt="${escapeHtml(imgData.fileName)}"></details></section><p><br></p>`;
        dialog.close();
        setTimeout(() => insertHtml(aiImgHtml), 50);
      }
    });
  }
  $('#imageChoicePreview').src = dataUrl;
  dialog.showModal();
}

function initWorkspaceEvents() {
  if (workspaceReady) return;
  const ws = $('#workspace');
  if (!ws) return;
  workspaceReady = true;
  let draggedSheetIndex = null;
  let paperDragGhost;
  let paperPointerDrag = null;

  function clearPaperDragState() {
    document.querySelectorAll('.sheet-dragging, .sheet-crumpling').forEach(el => el.classList.remove('sheet-dragging', 'sheet-crumpling'));
    document.querySelector('[data-sheet-trash]')?.classList.remove('ready', 'drag-over');
    paperDragGhost?.remove();
    paperDragGhost = null;
    draggedSheetIndex = null;
    paperPointerDrag = null;
  }

  function positionPaperDragGhost(clientX, clientY) {
    if (!paperDragGhost) return;
    paperDragGhost.style.left = `${clientX + 14}px`;
    paperDragGhost.style.top = `${clientY + 14}px`;
  }

  function updateTrashDragHover(clientX, clientY) {
    const trash = document.querySelector('[data-sheet-trash]');
    if (!trash) return;
    const over = document.elementFromPoint(clientX, clientY)?.closest('[data-sheet-trash]');
    trash.classList.toggle('drag-over', !!over);
  }

  ws.addEventListener('mousedown', event => {
    if (event.button !== 0 || !activePage()) return;
    if (event.target.closest('[data-sheet-trash], [data-empty-sheet-trash], button, input, textarea, select, .stack-page-index, .spell-context-menu, .fact-explain-popover, #editor, .sheet-editor')) return;
    const paper = event.target.closest('#notePaper, .continuous-paper, .paper[data-drag-sheet]');
    if (!paper) return;
    const sheetIndex = Number(paper.dataset.dragSheet ?? activePage().currentSheet ?? 0);
    if (!Number.isFinite(sheetIndex)) return;
    paperPointerDrag = {
      paper,
      sheetIndex,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      moved: false,
      selectionAtStart: window.getSelection()?.toString() || '',
    };
  });

  document.addEventListener('mousemove', event => {
    if (!paperPointerDrag) return;
    if (!paperPointerDrag.active) {
      const dx = event.clientX - paperPointerDrag.startX;
      const dy = event.clientY - paperPointerDrag.startY;
      if (Math.hypot(dx, dy) < 16) return;
      const selectionNow = window.getSelection()?.toString() || '';
      if (selectionNow && selectionNow !== paperPointerDrag.selectionAtStart) {
        paperPointerDrag = null;
        return;
      }
      paperPointerDrag.active = true;
      paperPointerDrag.moved = true;
      draggedSheetIndex = paperPointerDrag.sheetIndex;
      paperPointerDrag.paper.classList.add('sheet-dragging');
      paperDragGhost = document.createElement('div');
      paperDragGhost.className = 'paper-drag-ghost paper-drag-ghost-live';
      paperDragGhost.textContent = `Side ${draggedSheetIndex + 1}`;
      document.body.appendChild(paperDragGhost);
      document.querySelector('[data-sheet-trash]')?.classList.add('ready');
    }
    positionPaperDragGhost(event.clientX, event.clientY);
    updateTrashDragHover(event.clientX, event.clientY);
  });

  document.addEventListener('mouseup', event => {
    if (!paperPointerDrag) return;
    if (paperPointerDrag.active) {
      const trash = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-sheet-trash]');
      if (trash && draggedSheetIndex !== null) {
        const paper = paperDragArticle(draggedSheetIndex) || paperPointerDrag.paper;
        paper?.classList.add('sheet-crumpling');
        const sheetIndex = draggedSheetIndex;
        setTimeout(() => {
          deleteSheet(sheetIndex);
          clearPaperDragState();
        }, 260);
        return;
      }
      clearPaperDragState();
      return;
    }
    if (paperPointerDrag.moved) event.preventDefault();
    paperPointerDrag = null;
  });

  ws.addEventListener('dragstart', event => {
    if (event.target.closest('#editor, .sheet-editor, .stack-page-index input')) {
      event.preventDefault();
      return;
    }
    const sheet = event.target.closest('[data-drag-sheet]');
    if (!sheet || !activePage()) return;
    draggedSheetIndex = Number(sheet.dataset.dragSheet);
    if (!Number.isFinite(draggedSheetIndex)) return;
    const paper = paperDragArticle(draggedSheetIndex) || sheet.closest('.paper, .stack-sheet-layer');
    paper?.classList.add('sheet-dragging');
    sheet.classList.add('sheet-dragging');
    event.dataTransfer?.setData('text/plain', String(draggedSheetIndex));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      paperDragGhost = document.createElement('div');
      paperDragGhost.className = 'paper-drag-ghost';
      paperDragGhost.textContent = `Side ${draggedSheetIndex + 1}`;
      document.body.appendChild(paperDragGhost);
      event.dataTransfer.setDragImage(paperDragGhost, 52, 28);
    }
    document.querySelector('[data-sheet-trash]')?.classList.add('ready');
  });
  ws.addEventListener('dragend', () => clearPaperDragState());
  ws.addEventListener('dragover', event => {
    const trash = event.target.closest('[data-sheet-trash]');
    if (!trash || draggedSheetIndex === null) return;
    event.preventDefault();
    trash.classList.add('drag-over');
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  });
  ws.addEventListener('dragleave', event => {
    const trash = event.target.closest('[data-sheet-trash]');
    if (!trash) return;
    const related = event.relatedTarget;
    if (related && trash.contains(related)) return;
    trash.classList.remove('drag-over');
  });
  ws.addEventListener('drop', event => {
    const trash = event.target.closest('[data-sheet-trash]');
    if (!trash || draggedSheetIndex === null) return;
    event.preventDefault();
    const sheetIndex = draggedSheetIndex;
    const paper = paperDragArticle(sheetIndex);
    paper?.classList.add('sheet-crumpling');
    trash.classList.remove('drag-over');
    setTimeout(() => {
      deleteSheet(sheetIndex);
      clearPaperDragState();
    }, 260);
  });

  ws.addEventListener('mousedown', e => {
    if (e.target.closest('#toolbarPanel')) {
      const sel = window.getSelection();
      if (sel?.rangeCount && editorFromNode(sel.anchorNode)) captureEditorRange();
    }
    const cmd = e.target.closest('#toolbarPanel [data-command]');
    if (!cmd) return;
    e.preventDefault();
    focusedEditor()?.focus();
    document.execCommand(cmd.dataset.command, false, cmd.dataset.value || null);
    focusedEditor()?.dispatchEvent(new Event('input'));
  });

  ws.addEventListener('click', async e => {
    if (isGuest() && e.target.closest('[data-guest-write], .guest-readonly-paper .editor')) {
      e.preventDefault();
      openAuthDialog('login');
      return;
    }
    if (e.target.closest('[data-empty-sheet-trash]')) { emptySheetTrash(); return; }
    if (e.target.closest('[data-sheet-trash]')) return;
    if (e.target.closest('#toggleProofreading') && activePage()) {
      activePage().proofreading = activePage().proofreading === false;
      scheduleSave();
      renderWorkspace();
      return;
    }
    const spellFix = e.target.closest('[data-proofread-fix]');
    if (spellFix) return;
    if (!e.target.closest('.spell-context-menu')) hideSpellContextMenu();
    if (!e.target.closest('.fact-explain-popover')) hideFactExplainPopover();
    const stackSheet = e.target.closest('[data-stack-sheet]');
    if (stackSheet && activePage()) {
      syncActiveSheet();
      activePage().currentSheet = Number(stackSheet.dataset.stackSheet) || 0;
      activePage().pageView = 'stack';
      persist();
      renderWorkspace();
      return;
    }
    const openSheet = e.target.closest('[data-open-sheet]');
    if (openSheet && activePage()) {
      const requestedSheet = Number(openSheet.dataset.openSheet) || 0;
      if (e.target.closest('#editor') && requestedSheet === activePage().currentSheet) return;
      syncActiveSheet();
      activePage().currentSheet = requestedSheet;
      persist();
      renderWorkspace();
      return;
    }
    const sheetDirection = e.target.closest('[data-sheet-direction]');
    if (sheetDirection && activePage()) {
      const page = activePage();
      const direction = Number(sheetDirection.dataset.sheetDirection);
      if (page.pageView === 'book' && flipBookPage(direction)) return;
      syncActiveSheet();
      const next = page.currentSheet + direction;
      if (next < 0 || next >= page.sheets.length) return;
      page.currentSheet = Math.max(0, Math.min(next, page.sheets.length - 1));
      page.html = page.sheets.join('<div class="page-break"></div>');
      persist();
      renderWorkspace();
      return;
    }
    const bookFlip = e.target.closest('[data-book-flip]');
    if (bookFlip && activePage()?.pageView === 'book') {
      e.preventDefault();
      flipBookPage(Number(bookFlip.dataset.bookFlip));
      return;
    }
    const bookLinesToggle = e.target.closest('[data-book-lines]');
    if (bookLinesToggle && activePage()) {
      activePage().bookLines = activePage().bookLines === false;
      persist();
      renderWorkspace();
      return;
    }
    const zoomButton = e.target.closest('[data-paper-zoom]');
    if (zoomButton && activePage()) {
      activePage().paperZoom = Math.max(70, Math.min(150, (Number(activePage().paperZoom) || 100) + Number(zoomButton.dataset.paperZoom)));
      persist();
      renderWorkspace();
      return;
    }
    const paperPattern = e.target.closest('[data-paper-pattern]');
    if (paperPattern && activePage()) {
      activePage().paperPattern = paperPattern.dataset.paperPattern;
      persist();
      renderWorkspace();
      return;
    }
    const pageView = e.target.closest('[data-page-view]');
    if (pageView && activePage()) {
      syncActiveSheet();
      const page = activePage();
      const requested = pageView.dataset.pageView;
      if (requested === 'infinite') {
        page.sheets = [page.sheets.join('')];
        page.sheetTitles = [''];
        page.currentSheet = 0;
        page.pageView = 'infinite';
      } else {
        const wasInfinite = page.pageView === 'infinite';
        page.pageView = requested;
        if (wasInfinite) {
          page.sheets = [page.sheets.join('')];
          page.sheetTitles = [''];
          page.currentSheet = 0;
        }
      }
      persist();
      renderWorkspace();
      if (requested !== 'infinite') setTimeout(() => {
        if (requested === 'continuous') paginateContinuousSheets();
        else paginateActiveSheet();
      }, 40);
      return;
    }
    if (e.target.closest('[data-paper-corners]') && activePage()) {
      activePage().paperCorners = activePage().paperCorners === 'square' ? 'round' : 'square';
      persist();
      renderWorkspace();
      return;
    }
    if (e.target.closest('[data-writing-pointer]')) {
      activeWritingTool = { type: 'pointer', color: '' };
      document.body.classList.remove('marker-cursor', 'pen-cursor', 'comment-cursor', 'eraser-cursor');
      renderWorkspace();
      return;
    }
    const marker = e.target.closest('[data-marker-color]');
    if (marker) {
      if (activeWritingTool.type === 'marker' && activeWritingTool.color === marker.dataset.markerColor) {
        activeWritingTool = { type: 'pointer', color: '' };
        document.body.classList.remove('marker-cursor');
        renderWorkspace();
        return;
      }
      activeWritingTool = { type: 'marker', color: marker.dataset.markerColor };
      document.body.classList.remove('pen-cursor', 'comment-cursor', 'eraser-cursor');
      document.body.classList.add('marker-cursor');
      const page = activePage();
      if (page?.viewMode === 'annotate') {
        const canvas = $('#annotationCanvas');
        if (canvas) { canvas.dataset.tool = 'marker'; canvas.dataset.color = marker.dataset.markerColor; }
      }
      renderWorkspace();
      return;
    }
    const annotationTool = e.target.closest('[data-annotation-tool]');
    if (annotationTool) {
      activeWritingTool = { type: annotationTool.dataset.annotationTool, color: '' };
      document.body.classList.remove('marker-cursor', 'pen-cursor', 'comment-cursor', 'eraser-cursor');
      document.body.classList.add(`${annotationTool.dataset.annotationTool}-cursor`);
      const canvas = $('#annotationCanvas');
      if (!canvas) {
        activePage().viewMode = 'annotate';
        persist();
        renderWorkspace();
        setTimeout(() => { const nextCanvas = $('#annotationCanvas'); if (nextCanvas) nextCanvas.dataset.tool = annotationTool.dataset.annotationTool; }, 40);
        return;
      }
      canvas.dataset.tool = annotationTool.dataset.annotationTool;
      renderWorkspace();
      return;
    }
    if (e.target.closest('[data-clear-ink]')) {
      const page = activePage();
      if (page && confirm('Fjern alle tegnede markeringer fra denne side?')) {
        page.inkStrokes = [];
        persist();
        renderWorkspace();
      }
      return;
    }
    if (e.target.closest('[data-export-note-pdf]')) { exportActiveNotePdf(); return; }
    const pdfPin = e.target.closest('[data-pdf-comment]');
    if (pdfPin) {
      const comment = activePage()?.pdfComments?.[Number(pdfPin.dataset.pdfComment)];
      if (comment) alert(comment.text);
      return;
    }
    const inToolbar = e.target.closest('#toolbarPanel');
    if (inToolbar) {
      if (e.target.closest('#openLayoutPicker')) { openLayoutDialog(); return; }
      if (e.target.closest('#openModelsQuick')) {
        if (!requireLogin('Interaktive modeller kræver en profil.')) return;
        openModelDialog(); return;
      }
      if (e.target.closest('#openShortcutGuide')) { openShortcutGuide(); return; }
      const clipboard = e.target.closest('[data-clipboard]');
      if (clipboard) {
        const action = clipboard.dataset.clipboard;
        const editor = focusedEditor() || $('#editor');
        editor?.focus();
        if (editorRange && editor?.contains(editorRange.commonAncestorContainer)) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(editorRange);
        }
        if (action === 'paste') {
          navigator.clipboard?.readText().then(text => {
            if (text) document.execCommand('insertText', false, text);
            editor?.dispatchEvent(new Event('input'));
          }).catch(() => {
            editor?.focus();
            const state = $('#saveState');
            if (state) state.innerHTML = '<span class="save-dot local"></span> Tryk ⌘V for at indsætte';
          });
        } else {
          document.execCommand(action);
          editor?.dispatchEvent(new Event('input'));
        }
        return;
      }
      const tool = e.target.closest('[data-tool]');
      if (tool) {
        if (!requireLogin('Fagspecifikke værktøjer kræver en profil.')) return;
        trackRecentTool(tool.dataset.tool, tool.textContent.trim());
        if (!runStemTool(tool.dataset.tool)) insertUniversityTool(tool.dataset.tool);
        closeContextToolsMenu();
        return;
      }
      const universityTool = e.target.closest('[data-university-tool]');
      if (universityTool) {
        if (!requireLogin('Fagspecifikke værktøjer kræver en profil.')) return;
        trackRecentTool(universityTool.dataset.universityTool, universityTool.textContent.trim());
        insertUniversityTool(universityTool.dataset.universityTool);
        closeContextToolsMenu();
        return;
      }
      const recentToolBtn = e.target.closest('[data-recent-tool]');
      if (recentToolBtn) {
        if (!requireLogin('Fagspecifikke værktøjer kræver en profil.')) return;
        const toolId = recentToolBtn.dataset.recentTool;
        trackRecentTool(toolId, recentToolBtn.textContent.trim());
        if (!runStemTool(toolId)) insertUniversityTool(toolId);
        closeContextToolsMenu();
        return;
      }
      const codeBtn = e.target.closest('[data-open-code]');
      if (codeBtn) {
        if (!requireLogin('Kodeværktøjer kræver en profil.')) return;
        openCodeDialog(codeBtn.dataset.codeLang);
        closeContextToolsMenu();
        return;
      }
      if (e.target.closest('#openCode')) {
        if (!requireLogin('Kodeværktøjer kræver en profil.')) return;
        openCodeDialog('JavaScript'); return;
      }
      const codeTemplate = e.target.closest('[data-code-template]');
      if (codeTemplate) { insertCodeTemplate(codeTemplate.dataset.codeTemplate); return; }
      if (e.target.closest('#openCalculator')) {
        if (!requireLogin('Lommeregneren kræver en profil.')) return;
        runStemTool('calculator'); return;
      }
      if (e.target.closest('#startDictation')) {
        startDictationToNotes(); return;
      }
      if (e.target.closest('#openMath')) {
        if (!requireLogin('Formel og LaTeX værktøjer kræver en profil.')) return;
        openMathDialog(); return;
      }
      if (e.target.closest('#insertFormula')) {
        if (!requireLogin('Formelværktøjer kræver en profil.')) return;
        if (pageHasFormulaTools(activePage())) openFormulaLibrary();
        else runStemTool('formula');
        return;
      }
      const quickFormulaBtn = e.target.closest('[data-quick-formula]');
      if (quickFormulaBtn) {
        if (!requireLogin('Formelværktøjer kræver en profil.')) return;
        const preset = QUICK_FORMULA_PRESETS.find(item => item.id === quickFormulaBtn.dataset.quickFormula);
        if (preset) insertEditableFormula(preset.formula, preset.note);
        return;
      }
      if (e.target.closest('#openFormulaLibrary')) {
        if (!requireLogin('Formelbiblioteket kræver en profil.')) return;
        openFormulaLibrary(); return;
      }
      if (e.target.closest('#openPdf')) { openPdfDialog(); return; }
      if (e.target.closest('#toggleDocumentMode')) {
        if (!requireLogin('PDF markering kræver en profil.')) return;
        const page = activePage();
        if (!page) return;
        page.viewMode = page.viewMode === 'annotate' ? 'write' : 'annotate';
        persist();
        renderWorkspace();
        return;
      }
      if (e.target.closest('#insertSticky')) {
        openStickyPicker();
        return;
      }
      if (e.target.closest('#insertImportant')) {
        captureEditorRange();
        insertHtml(`<aside class="important-memory"><strong>Vigtigt at huske</strong><p>Skriv det vigtigste her...</p></aside><p><br></p>`);
        return;
      }
      if (e.target.closest('#startNoteExamMode')) {
        openNoteExamMode();
        return;
      }
      if (e.target.closest('#insertFlashcard')) { insertFlashcardHtml(); return; }
      const studyHelpBtn = e.target.closest('[data-study-help]');
      if (studyHelpBtn) {
        closeStudyHelpMenu();
        runQuickStudyHelp(studyHelpBtn.dataset.studyHelp);
        return;
      }
      if (e.target.closest('#toggleStudyHelp')) { toggleStudyHelpMenu(); return; }
      if (!e.target.closest('.study-help-dropdown')) closeStudyHelpMenu();
      if (e.target.closest('#openToolPacks, #openToolPacksMore')) { openToolPacksDialog(); return; }
      if (e.target.closest('#studyExplain')) { runQuickStudyHelp('explain'); return; }
      if (e.target.closest('#studySummary')) { runQuickStudyHelp('summarize'); return; }
      if (e.target.closest('#studyQuiz')) { runQuickStudyHelp('questions'); return; }
      if (e.target.closest('#studyProof')) { runQuickStudyHelp('proofread'); return; }
      if (e.target.closest('#openExamToolbar')) { openExamDialog(); return; }
      if (e.target.closest('#toggleToolbar')) { toggleToolbarExpand(); return; }
      if (e.target.closest('#toggleContextTools')) { toggleContextToolsMenu(); return; }
      if (!e.target.closest('.context-tools-dropdown')) closeContextToolsMenu();
      if (e.target.closest('#runFactCheck')) { runFactCheck(false); return; }
    }

    if (e.target.closest('#quickStart')) {
      if (!data.subjects.length) openSubjectDialog();
      else if (!data.semesters.length) openSemesterDialog();
      return;
    }
    if (e.target.closest('#startOnboarding') || e.target.closest('#openGuide')) {
      openOnboardingDialog({ review: true });
      return;
    }
    if (e.target.closest('#guestBannerUpgrade')) {
      openAuthDialog('signup');
      return;
    }
    if (e.target.closest('#dismissGuestBanner')) {
      localStorage.setItem('noted-guest-banner-dismissed', '1');
      $('#guestBanner')?.remove();
      return;
    }
    if (e.target.closest('#dismissVersionBanner')) {
      $('#versionUpdateBanner')?.remove();
      return;
    }
    const planNoteBtn = e.target.closest('[data-open-plan-note]');
    if (planNoteBtn) {
      e.preventDefault();
      openPlanTaskMaterial(planNoteBtn.dataset.openPlanNote);
      return;
    }
    const planTrainBtn = e.target.closest('[data-start-plan-training]');
    if (planTrainBtn) {
      e.preventDefault();
      startPlanTaskTraining(planTrainBtn.dataset.startPlanTraining);
      return;
    }
    const fcEditBtn = e.target.closest('[data-edit-flashcard-set]');
    if (fcEditBtn) {
      openFlashcardEditor(fcEditBtn.dataset.editFlashcardSet);
      return;
    }
    const renameTarget = e.target.closest('[data-rename-notebook], [data-rename-subject], [data-rename-page]');
    if (renameTarget) {
      e.preventDefault();
      e.stopPropagation();
      startInlineRename(renameTarget);
      return;
    }
    if (e.target.closest('#quickAddPage')) { openPageDialog(); return; }
    if (e.target.closest('[data-start-notebook]')) { openNotebookDialog(); return; }
    if (e.target.closest('[data-start-subject]')) { openSubjectDialog(); return; }
    const notebookPaper = e.target.closest('[data-notebook-subject]');
    if (notebookPaper) {
      const pageId = notebookPaper.dataset.notebookPage;
      if (pageId) selectPage(pageId);
      else {
        data.currentSubject = notebookPaper.dataset.notebookSubject;
        data.ui.view = 'home';
        data.ui.subjectOpen[data.currentSubject] = true;
        persist();
        renderSubjects();
        openPageDialog();
      }
      return;
    }
    const deleteNotebook = e.target.closest('[data-delete-notebook]');
    if (deleteNotebook) {
      const notebookId = deleteNotebook.dataset.deleteNotebook;
      const notebook = data.semesters.find(item => item.id === notebookId);
      if (!notebook || !confirm(`${U('deleteNotebookFirst')}\n\n${notebook.name}`)) return;
      if (!confirm(U('deleteNotebookAgain'))) return;
      const subjectIds = data.subjects.filter(subject => subject.semesterId === notebookId).map(subject => subject.id);
      data.pages.filter(page => subjectIds.includes(page.subjectId)).forEach(page => {
        data.trash.unshift({ ...page, deletedAt: new Date().toISOString() });
      });
      data.pages = data.pages.filter(page => !subjectIds.includes(page.subjectId));
      data.subjects = data.subjects.filter(subject => subject.semesterId !== notebookId);
      data.semesters = data.semesters.filter(item => item.id !== notebookId);
      if (subjectIds.includes(data.currentSubject)) {
        data.currentSubject = null;
        data.currentPage = null;
      }
      data.ui.notebookIndex = Math.max(0, Math.min((Number(data.ui.notebookIndex) || 0) - 1, data.semesters.length - 1));
      data.ui.view = 'notebook';
      persist();
      render();
      return;
    }
    const notebookDirection = e.target.closest('[data-notebook-direction]');
    if (notebookDirection) {
      data.ui.notebookIndex = Math.max(0, (Number(data.ui.notebookIndex) || 0) + Number(notebookDirection.dataset.notebookDirection));
      persist();
      renderWorkspace();
      return;
    }

    const tab = e.target.closest('[data-editor-tab]');
    if (tab && !e.target.closest('[data-close-tab]')) { selectPage(tab.dataset.editorTab); return; }
    const closeTab = e.target.closest('[data-close-tab]');
    if (closeTab) {
      const id = closeTab.dataset.closeTab;
      const p = data.pages.find(x => x.id === id);
      if (!p || !confirm(`Flyt "${p.title}" til Sidst slettet?\n\nNoten slettes automatisk efter 24 timer.`)) return;
      movePageToTrash(id);
      persist(); render(); return;
    }
    if (e.target.closest('#addPageTab')) { openPageDialog(); return; }

    const insertAnswer = e.target.closest('[data-insert-answer]');
    const followAnswer = e.target.closest('[data-follow-answer]');
    if (insertAnswer || followAnswer) {
      const p = activePage();
      const index = Number((insertAnswer || followAnswer).dataset.insertAnswer ?? followAnswer?.dataset.followAnswer);
      const c = p?.comments?.[index];
      if (!p || !c) return;
      if (insertAnswer) {
        const answer = escapeHtml(c.text).replace(/\n/g, '<br>');
        if (insertAnswer.dataset.mode === 'sticky') {
          const stickyColors = ['#f4dfa2', '#d7e7df', '#dbe6f0', '#eadbe5'];
          const color = stickyColors[index % stickyColors.length];
          p.html += `<div class="sticky-note sticky-medium" data-sticky contenteditable="false" style="--sticky-color:${color};--sticky-x:0px;--sticky-y:0px"><button type="button" class="sticky-delete" contenteditable="false" title="Fjern sticky note">×</button><span class="sticky-pin"></span><div class="sticky-content" contenteditable="true">${answer}</div></div><p><br></p>`;
        } else {
          p.html += `<section class="ai-note-insert"><strong>${escapeHtml((c.type || 'Studiehjælp').replace(/AI hjælp/gi, 'Studiehjælp'))}</strong><p>${answer}</p></section><p><br></p>`;
        }
        p.updated = new Date().toISOString();
        persist();
        renderWorkspace();
        return;
      }
      const input = document.querySelector(`[data-follow-input="${index}"]`);
      const question = input?.value.trim();
      if (!question) return input?.focus();
      followAnswer.disabled = true;
      followAnswer.textContent = 'Tænker...';
      try {
        const history = Array.isArray(c.history) ? c.history : [
          { role: 'assistant', content: c.text },
        ];
        const expanded = await callAI(
          'Besvar opfølgningen præcist og pædagogisk. Byg videre på samtalen uden at gentage hele det gamle svar. Forklar fagord, brug et konkret eksempel, og sig tydeligt hvis noterne ikke giver nok grundlag til et sikkert svar.',
          question,
          { action: 'followup', history, context: currentStudyContext() },
        );
        c.text += `\n\nOpfølgning: ${question}\n${expanded}`;
        c.history = [...history, { role: 'user', content: question }, { role: 'assistant', content: expanded }].slice(-10);
        persist();
        renderWorkspace();
      } catch (error) {
        followAnswer.disabled = false;
        followAnswer.textContent = 'Spørg videre';
        alert(error.message);
      }
      return;
    }
    const rm = e.target.closest('[data-delete-comment]');
    const ap = e.target.closest('[data-apply-comment]');
    if (rm || ap) {
      const p = activePage();
      const ed = $('#editor');
      if (!p || !ed) return;
      if (rm) {
        p.comments.splice(Number(rm.dataset.deleteComment), 1);
        persist(); renderWorkspace(); return;
      }
      const c = p.comments[Number(ap.dataset.applyComment)];
      const children = [...ed.children];
      const start = Math.max(0, c.from - 1);
      const end = Math.min(children.length, c.to);
      const marker = document.createElement('span');
      if (children[start]) children[start].before(marker);
      children.slice(start, end).forEach(ch => ch.remove());
      c.replacement.split('\n').forEach(line => { const para = document.createElement('p'); para.textContent = line || ' '; marker.before(para); });
      marker.remove();
      p.html = ed.innerHTML;
      p.comments.splice(Number(ap.dataset.applyComment), 1);
      persist();
      renderWorkspace();
    }
  });

  ws.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('#editor, .sheet-editor')) {
      const p = activePage();
      if (!p) return;
      if (t.matches('[data-sheet-editor]')) lastContinuousEditorSheet = Number(t.dataset.sheetEditor) || 0;
      syncEditorToPage(t, p);
      scheduleSave();
      scheduleAiAutoCorrect(t);
      scheduleWidgets();
      schedulePagination();
    }
    if (t.id === 'pageTitle') {
      const p = activePage();
      if (!p) return;
      p.title = t.value;
      p.updated = new Date().toISOString();
      scheduleSave();
    }
    if (t.matches('[data-sheet-title]')) {
      const p = activePage();
      if (!p) return;
      ensurePageSheets(p);
      const index = Number(t.dataset.sheetTitle);
      p.sheetTitles[index] = t.value;
      scheduleSave();
    }
    if (t.id === 'textColor') {
      document.execCommand('foreColor', false, t.value);
      $('#editor')?.dispatchEvent(new Event('input'));
    }
    if (t.id === 'highlightColor') {
      document.execCommand('hiliteColor', false, t.value);
      $('#editor')?.dispatchEvent(new Event('input'));
    }
  });

  ws.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'pageDeadline' && activePage()) { activePage().deadline = t.value; scheduleSave(); }
    if (t.id === 'pageLanguage' && activePage()) {
      activePage().language = t.value;
      const ed = $('#editor');
      if (ed) ed.lang = t.value;
      refreshToolbarLang(t.value);
      scheduleSave();
    }
    if (t.id === 'fontName') { document.execCommand('fontName', false, t.value); focusedEditor()?.focus(); }
    if (t.id === 'fontSize') { applySelectionStyle('fontSize', t.value + 'px'); focusedEditor()?.focus(); }
  });

  ws.addEventListener('keyup', e => {
    if (e.target.id === 'editor' && (e.key === ' ' || e.key === 'Enter' || /^[0-9a-zA-Z]$/.test(e.key))) {
      autoScriptOnInput(e.target);
    }
  });
  ws.addEventListener('mouseup', e => {
    if (e.target.closest('#editor')) resetEditorDeleteState();
    if (activeWritingTool.type !== 'marker' || !e.target.closest('#editor')) return;
    const selection = window.getSelection();
    if (selection?.toString().trim()) {
      captureEditorRange();
      applyMarkerColor(activeWritingTool.color);
    }
  });
  ws.addEventListener('contextmenu', e => {
    const span = e.target.closest('.proofread-mark');
    const editor = $('#editor');
    if (!span || !editor?.contains(span)) return;
    e.preventDefault();
    openProofreadMenuForSpan(span, e.clientX, e.clientY);
  });
  ws.addEventListener('keydown', e => {
    const editorEl = editorFromNode(e.target);
    if (e.target.id === 'noteSearch' && e.key === 'Enter') {
      e.preventDefault();
      const page = activePage();
      const query = e.target.value.trim().toLowerCase();
      if (!page || !query) return;
      ensurePageSheets(page);
      const hit = page.sheets.findIndex(sheet => {
        const node = document.createElement('div');
        node.innerHTML = sheet;
        return node.textContent.toLowerCase().includes(query);
      });
      if (hit < 0) return alert('Teksten blev ikke fundet i denne note.');
      page.currentSheet = hit;
      page.pageView = 'single';
      renderWorkspace();
      setTimeout(() => window.find?.(e.target.value), 80);
      return;
    }
    if (editorEl && e.key === ' ' && !e.metaKey && !e.ctrlKey && !e.altKey && convertTypedListMarker(editorEl)) {
      e.preventDefault();
      return;
    }
    if (editorEl && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      pendingFullDocumentSelectAll = true;
      const range = document.createRange();
      range.selectNodeContents(editorEl);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    }
    if (editorEl && (e.key === 'Backspace' || e.key === 'Delete')) {
      const selection = window.getSelection();
      const selectedInsideEditor = selection?.rangeCount
        && !selection.isCollapsed
        && editorEl.contains(selection.anchorNode)
        && editorEl.contains(selection.focusNode);
      if (selectedInsideEditor && isEditorFullySelected(editorEl, selection)) {
        e.preventDefault();
        resetEditorDeleteState();
        clearEntireNotePage();
        return;
      }
      if (selectedInsideEditor) {
        e.preventDefault();
        resetEditorDeleteState();
        deleteSelectedEditorContent(editorEl);
        return;
      }
    }
    if (editorEl && e.key === 'Backspace' && crossPageBackspaceHeld) {
      e.preventDefault();
      return;
    }
    if (editorEl && e.key === 'Backspace' && editorCaretAtBoundary(editorEl, 'start') && activePage()?.currentSheet > 0 && activePage()?.pageView !== 'continuous') {
      e.preventDefault();
      crossPageBackspaceHeld = true;
      mergeAdjacentSheet(-1);
      startCrossPageBackspace();
      return;
    }
    if (editorEl && e.key === 'Delete' && editorCaretAtBoundary(editorEl, 'end') && activePage()?.currentSheet < activePage().sheets.length - 1 && activePage()?.pageView !== 'continuous') {
      e.preventDefault();
      mergeAdjacentSheet(1);
      return;
    }
    if (editorEl && capitalizeTypedLetter(e, editorEl)) return;
    if (editorEl && e.key === 'Enter' && activePage()?.layout === 'outline') {
      const selection = window.getSelection();
      const anchor = selection?.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection?.anchorNode;
      const listItem = anchor?.closest?.('li');
      const section = listItem?.closest?.('.outline-section');
      if (listItem && section && !listItem.textContent.trim()) {
        e.preventDefault();
        listItem.remove();
        const nextSection = document.createElement('section');
        nextSection.className = 'outline-section';
        nextSection.innerHTML = '<h2>Ny overskrift</h2><ul><li>Stikord</li></ul>';
        section.after(nextSection);
        const heading = nextSection.querySelector('h2');
        const range = document.createRange();
        range.selectNodeContents(heading);
        const nextSelection = window.getSelection();
        nextSelection.removeAllRanges();
        nextSelection.addRange(range);
        editorEl.dispatchEvent(new Event('input'));
        return;
      }
    }
    if (editorEl && (e.metaKey || e.ctrlKey)) {
      const key = e.key.toLowerCase();
      if (['a', 'c', 'v', 'x'].includes(key)) return;
      const commands = { b: 'bold', i: 'italic', u: 'underline', e: 'justifyCenter', l: 'justifyLeft', r: 'justifyRight' };
      if (commands[key]) {
        e.preventDefault();
        document.execCommand(commands[key]);
        editorEl.dispatchEvent(new Event('input'));
      }
      if (key === 'k') {
        e.preventDefault();
        const url = prompt('Indsæt link:', 'https://');
        if (url?.trim()) document.execCommand('createLink', false, url.trim());
        editorEl.dispatchEvent(new Event('input'));
      }
      if (key === 's') {
        e.preventDefault();
        const page = activePage();
        if (page) { syncEditorToPage(editorEl, page); persist(); }
        const state = $('#saveState');
        if (state) state.innerHTML = '<span class="save-dot"></span> Gemt nu';
      }
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        document.execCommand('redo');
        editorEl.dispatchEvent(new Event('input'));
      } else if (key === 'z') {
        e.preventDefault();
        document.execCommand('undo');
        editorEl.dispatchEvent(new Event('input'));
      }
    }
    if (editorEl && (e.key === ' ' || e.key === 'Enter' || /^[.,!?;:]$/.test(e.key))) {
      correctWordBeforeCaret(editorEl);
    }
  });
  ws.addEventListener('paste', e => {
    const editorEl = editorFromNode(e.target);
    if (!editorEl) return;
    const data = e.clipboardData;
    const image = [...(data?.items || [])].find(item => item.type.startsWith('image/'));
    if (image) {
      e.preventDefault();
      const file = image.getAsFile();
      const reader = new FileReader();
      reader.onload = () => showImageInsertChoice(reader.result, file?.name || 'indsat skærmbillede');
      reader.readAsDataURL(file);
      return;
    }
    e.preventDefault();
    const html = data?.getData('text/html');
    const text = data?.getData('text/plain') || '';
    if (html && html.trim()) {
      document.execCommand('insertHTML', false, cleanPastedHtml(html));
    } else if (text) {
      const safe = text.split(/\r?\n/).map(line => line ? escapeHtml(line) : '<br>').join('<br>');
      document.execCommand('insertHTML', false, safe);
    }
    editorEl.dispatchEvent(new Event('input', { bubbles: true }));
  });

  ws.addEventListener('dragover', e => { if (editorFromNode(e.target)) e.preventDefault(); });
  ws.addEventListener('drop', e => {
    if (!editorFromNode(e.target)) return;
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => showImageInsertChoice(reader.result, file.name || 'billede');
      reader.readAsDataURL(file);
    }
  });
  document.addEventListener('keyup', event => {
    if (event.key === 'Backspace') stopCrossPageBackspace();
  });
  window.addEventListener('blur', stopCrossPageBackspace);
}

function convertTypedListMarker(editor) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;
  const element = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
  let block = element?.closest?.('p, div, li');
  const directTextNode = range.startContainer.nodeType === Node.TEXT_NODE && range.startContainer.parentElement === editor
    ? range.startContainer
    : null;
  if (block === editor) block = null;
  if ((!block && !directTextNode) || (block && (!editor.contains(block) || block.closest('li')))) return false;

  const beforeCaret = document.createRange();
  beforeCaret.selectNodeContents(block || directTextNode);
  beforeCaret.setEnd(range.startContainer, range.startOffset);
  const marker = beforeCaret.toString().trim();
  if (marker !== '-' && marker !== '*') return false;

  const list = document.createElement('ul');
  list.className = marker === '-' ? 'typed-dash-list' : 'typed-bullet-list';
  const item = document.createElement('li');
  item.appendChild(document.createElement('br'));
  list.appendChild(item);
  (block || directTextNode).replaceWith(list);

  const nextRange = document.createRange();
  nextRange.setStart(item, 0);
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function refreshToolbarLang(lang) {
  const panel = $('#toolbarPanel');
  const hint = document.querySelector('.toolbar-hint');
  const expanded = data.ui.toolbarExpanded;
  const page = activePage();
  if (!panel) return;
  panel.innerHTML = renderToolbarHtml(lang, expanded, page);
  panel.classList.toggle('expanded', expanded);
  panel.classList.toggle('compact', !expanded);
  if (hint) hint.textContent = L(lang, 'hint');
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

function normalize(d) {
  if (!d.semesters) d.semesters = [];
  d.semesters = d.semesters.map(migrateSemester);
  if (!d.subjects) d.subjects = [];
  if (!d.pages) d.pages = [];
  if (!Array.isArray(d.trash)) d.trash = [];
  const trashCutoff = Date.now() - 24 * 60 * 60 * 1000;
  d.trash = d.trash.filter(item => new Date(item.deletedAt || 0).getTime() > trashCutoff);
  if (!d.projects) d.projects = [];
  if (!d.groups) d.groups = [];
  d.projects = d.projects.map(project => ({
    mode: 'brainstorm', members: [], notes: '', cards: [], files: [], tasks: [], decisions: [],
    workspaces: { milestones: [], kanban: [], research: [], risks: [], team: [], report: [] },
    ...project,
    workspaces: {
      milestones: [], kanban: [], research: [], risks: [], team: [], report: [],
      ...(project.workspaces || {}),
    },
  }));
  d.groups = d.groups.map(group => ({
    members: [], notes: '', cards: [], quiz: [], roles: {}, sources: [], decisions: [], feedback: '', files: [],
    workspaces: { board: [], meetings: [], tasks: [], roleList: [], feedbackList: [] },
    ...group,
    workspaces: {
      board: [], meetings: [], tasks: [], roleList: [], feedbackList: [],
      ...(group.workspaces || {}),
    },
  }));
  if (!d.resources) d.resources = [
    { id: 'res-formulas', name: 'Formelbibliotek' },
    { id: 'res-code', name: 'Kode Snippets' },
    { id: 'res-sheets', name: 'Datasheets' },
    { id: 'res-arduino', name: 'Arduino Bibliotek' },
    { id: 'res-models', name: 'Interaktive modeller' },
  ];
  if (!d.resources.some(r => r.id === 'res-models')) d.resources.push({ id: 'res-models', name: 'Interaktive modeller' });
  if (!d.ui) d.ui = { projectsOpen: false, resourcesOpen: false, widgetsOpen: true, toolbarExpanded: false, capabilitiesFirstOpen: false, programOpen: {}, semesterOpen: {} };
  if (!d.ui.programOpen) d.ui.programOpen = {};
  if (!d.ui.semesterOpen) d.ui.semesterOpen = {};
  if (!d.ui.subjectOpen) d.ui.subjectOpen = {};
  if (!d.ui.view) d.ui.view = 'notebook';
  if (!Number.isFinite(Number(d.ui.notebookIndex))) d.ui.notebookIndex = 0;
  d.subjects.forEach(s => { if (!s.semesterId && d.semesters[0]) s.semesterId = d.semesters[0].id; });
  d.pages.forEach(p => {
    if (!p.comments) p.comments = [];
    if (!p.docType) p.docType = 'general';
    if (!p.expectations) p.expectations = 3;
    if (!p.classLevel) p.classLevel = 'universitet';
    if (p.factCheck === undefined) p.factCheck = false;
    if (!p.goal) p.goal = '';
    if (!p.created) p.created = p.updated || new Date().toISOString();
    if (!p.viewMode) p.viewMode = 'write';
    if (!p.layout) p.layout = 'classic';
    if (!['clear', 'dots', 'lined', 'grid', 'cornell'].includes(p.paperPattern)) p.paperPattern = 'dots';
    if (!['bullet', 'dash', 'star'].includes(p.listMarker)) p.listMarker = 'bullet';
    if (!Array.isArray(p.sheets) || !p.sheets.length) p.sheets = [p.html || '<p><br></p>'];
    if (!Array.isArray(p.sheetTitles)) p.sheetTitles = [];
    if (!Array.isArray(p.sheetTrash)) p.sheetTrash = [];
    p.sheetTitles = p.sheets.map((_, index) => /^Side \d+$/.test(p.sheetTitles[index] || '') ? '' : (p.sheetTitles[index] || ''));
    p.currentSheet = Math.max(0, Math.min(Number(p.currentSheet) || 0, p.sheets.length - 1));
    if (!['single', 'continuous', 'stack', 'infinite', 'book'].includes(p.pageView)) p.pageView = 'continuous';
    if (p.bookLines === undefined) p.bookLines = true;
    if (!['round', 'square'].includes(p.paperCorners)) p.paperCorners = 'round';
    if (p.autoCorrect === undefined) p.autoCorrect = appSettings.autoCorrect !== false;
    if (p.proofreading === undefined) p.proofreading = true;
    p.paperZoom = Math.max(70, Math.min(150, Number(p.paperZoom) || 100));
    p.html = p.sheets.join('<div class="page-break"></div>');
    if (!Array.isArray(p.inkStrokes)) p.inkStrokes = [];
    if (!Array.isArray(p.pdfComments)) p.pdfComments = [];
    if (!Array.isArray(p.toolPacks) || !p.toolPacks.length) {
      const docPack = ['mathematics', 'physics', 'tech', 'chemistry', 'engineering', 'civilEngineering', 'electricalEngineering', 'mechanicalEngineering', 'softwareEngineering', 'biology', 'medicine', 'biotechnology'].includes(p.docType) ? 'stem' : p.docType;
      p.toolPacks = [toolPacks[docPack] ? docPack : 'general'];
    }
    p.toolPacks = [...new Set(p.toolPacks.filter(pack => toolPacks[pack]))];
  });
  delete d.openTabs;
  return d;
}

function load() {
  try {
    const s = scopedStorage('workspace', STORAGE_KEY);
    if (s) return JSON.parse(s);
    const v4 = localStorage.getItem('stemnotes-v4');
    if (v4) {
      const p = JSON.parse(v4);
      return {
        semesters: [{ id: 'sem-default', program: 'bachelor', year: 1, sort: 0 }],
        subjects: (p.subjects || []).map(s => ({ id: s.id, name: s.name, color: s.color || colors[0], semesterId: 'sem-default' })),
        pages: (p.pages || []).map(pg => ({
          id: pg.id, subjectId: pg.subjectId, title: pg.title || '', html: pg.html || '',
          deadline: pg.deadline || '', language: pg.language, comments: pg.comments || [],
          updated: pg.updated || new Date().toISOString(),
        })),
        currentSubject: p.currentSubject || null,
        currentPage: p.currentPage || null,
      };
    }
    return structuredClone(blank);
  } catch { return structuredClone(blank); }
}

function persist() {
  data.lastUpdated = new Date().toISOString();
  if (isGuest()) {
    const el = $('#saveState');
    if (el) el.innerHTML = '<span class="save-dot local"></span> Ikke gemt';
    updateSyncStatus();
    return;
  }
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
    const email = activeAccountEmail();
    if (email) localStorage.setItem(accountStorageKey(email, 'workspace'), serialized);
  } catch (e) {
    console.warn('Lagring fejlede', e);
  }
  const el = $('#saveState');
  if (el) el.innerHTML = '<span class="save-dot"></span> Gemt';
  updateSyncStatus();
}

function updateSyncStatus() {
  const sync = $('#syncStatus');
  if (!sync) return;
  const updated = new Date(data.lastUpdated || activePage()?.updated || Date.now());
  const seconds = Math.max(0, Math.floor((Date.now() - updated.getTime()) / 1000));
  const when = seconds < 5 ? 'lige nu' : seconds < 60 ? `for ${seconds} sekunder siden` : seconds < 3600 ? `for ${Math.floor(seconds / 60)} minutter siden` : `kl. ${updated.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`;
  sync.innerHTML = isGuest()
    ? `<span class="sync-dot local"></span> Gæst — gemmes ikke · ændret ${when}`
    : `<span class="sync-dot"></span> Gemt lokalt · opdateret ${when}`;
}
setInterval(updateSyncStatus, 1000);

function showGuestSaveNotice() {
  const notice = $('#guestSaveNotice');
  if (!notice) return;
  notice.classList.add('visible');
  clearTimeout(guestNoticeTimer);
  guestNoticeTimer = setTimeout(() => notice.classList.remove('visible'), 6500);
}

function escapeHtml(t = '') {
  return t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
}

function activePage() { return data.pages.find(p => p.id === data.currentPage); }
function activeSubject() { return data.subjects.find(s => s.id === data.currentSubject); }

function appBuildLabel() {
  return window.__NOTEIT_BUILD__ || document.querySelector('meta[name="noteit-build"]')?.content || '';
}

function persistAppSettings() {
  try {
    const serialized = JSON.stringify(appSettings);
    localStorage.setItem('stemnotes-settings', serialized);
    const email = activeAccountEmail();
    if (email) localStorage.setItem(accountStorageKey(email, 'settings'), serialized);
  } catch {}
}

function trackRecentTool(toolId, label) {
  if (!toolId) return;
  if (CODE_EDITOR_TOOL_ALIASES.has(toolId)) {
    toolId = 'code';
    label = 'Kodeeditor';
  }
  appSettings.recentTools = [{ id: toolId, label: label || toolId, at: Date.now() }, ...(appSettings.recentTools || []).filter(item => item.id !== toolId)].slice(0, 8);
  persistAppSettings();
}

function getRecommendedTools(page) {
  const packId = page?.toolPacks?.[0] || studyFieldPack(appSettings.studyField) || 'general';
  const pack = toolPacks[packId];
  return (pack?.tools || []).slice(0, 4).map(([id, label]) => ({ id, label }));
}

function earnRewardPoints(amount, key) {
  if (isGuest() || amount <= 0) return;
  rewardData.rewardLog = rewardData.rewardLog || [];
  if (key && rewardData.rewardLog.includes(key)) return;
  rewardData.points = (Number(rewardData.points) || 0) + amount;
  rewardData.earned = (Number(rewardData.earned) || 0) + amount;
  if (key) rewardData.rewardLog.push(key);
  saveRewards();
  renderRewardStrip();
  renderProfileStatus();
}

function nextRewardHint() {
  const tasks = (examData.plan || []).flatMap(day => day.tasks || []);
  const unchecked = tasks.find(task => !examData.checks[task.id]);
  if (unchecked) return `Næste klip: +${REWARD_AMOUNTS.planCheck} når du afkrydser «${(unchecked.topic || '').slice(0, 36)}»`;
  return `Næste klip: +${REWARD_AMOUNTS.trainingDone} når du gennemfører træning`;
}

function findPlanTask(taskId) {
  return (examData.plan || []).flatMap(day => day.tasks || []).find(task => task.id === taskId);
}

function findExamSubjectForTask(task) {
  return (examData.subjects || []).find(subject => subject.name === task.subject || subject.id === task.subjectId);
}

function renderPlanTaskRow(task, showSubject = false) {
  const subject = findExamSubjectForTask(task);
  const noteSubjectId = subject?.subjectId;
  const pages = noteSubjectId ? data.pages.filter(page => page.subjectId === noteSubjectId) : [];
  const hasNotes = pages.length > 0;
  const isTraining = /repetition|prøveeksamen|træn/i.test(task.topic || '');
  const actions = `<span class="plan-task-actions">${hasNotes ? `<button type="button" class="plan-task-btn" data-open-plan-note="${task.id}" title="Åbn materiale">📓 Materiale</button>` : ''}${isTraining || hasNotes ? `<button type="button" class="plan-task-btn" data-start-plan-training="${task.id}" title="Start træning">▶ Træn</button>` : ''}</span>`;
  return `<label class="plan-task ${examData.checks[task.id] ? 'completed' : ''}"><input type="checkbox" data-exam-check="${task.id}" ${examData.checks[task.id] ? 'checked' : ''}><span>${showSubject ? `<b>${escapeHtml(task.subject)}</b> · ` : ''}${escapeHtml(task.topic)}</span>${actions}</label>`;
}

function openPlanTaskMaterial(taskId) {
  const task = findPlanTask(taskId);
  if (!task) return;
  const subject = findExamSubjectForTask(task);
  if (!subject?.subjectId) return alert('Knyt faget til dine noter i eksamensplanen først.');
  const pages = data.pages.filter(page => page.subjectId === subject.subjectId);
  const topicLower = (task.topic || '').toLowerCase();
  const match = pages.find(page => (page.title || '').toLowerCase().includes(topicLower.slice(0, 24))) || pages[0];
  if (!match) return alert('Opret en note under dette fag først.');
  data.currentSubject = subject.subjectId;
  data.currentPage = match.id;
  persist();
  $('#examDialog')?.close();
  $('#examPrepDialog')?.close();
  render();
}

function startPlanTaskTraining(taskId) {
  const task = findPlanTask(taskId);
  if (!task) return;
  const subject = findExamSubjectForTask(task);
  if (!subject) return alert('Faget findes ikke i planen.');
  $('#examDialog')?.close();
  if (/flashcard|repetition/i.test(task.topic || '')) openExamActivity('flashcards', 'train');
  else if (/prøveeksamen/i.test(task.topic || '')) {
    openExamActivity('quiz', 'overview');
    startExamActivityTraining('quiz');
  } else {
    openExamActivity('quiz', 'overview');
    startExamActivityTraining('mixed');
  }
  setTimeout(() => {
    document.querySelectorAll('#examActivitySubjects input, #examTrainingSubjects input, #examFlashcardSubjects input').forEach(input => {
      input.checked = input.value === subject.id;
    });
  }, 120);
}

function renderGuestBanner() {
  $('#guestBanner')?.remove();
}

function checkAppVersionUpdate() {
  const build = appBuildLabel();
  if (!build || build === '__BUILD__') return;
  const prev = localStorage.getItem('noted-last-build');
  if (prev && prev !== build) {
    let banner = $('#versionUpdateBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'versionUpdateBanner';
      banner.className = 'version-update-banner';
      document.getElementById('app')?.prepend(banner);
    }
    banner.hidden = false;
    banner.innerHTML = `<span>Ny version (Build ${escapeHtml(build)}). <strong>Genstart appen</strong> (Cmd+Q) for at sikre alle opdateringer.</span><button type="button" id="dismissVersionBanner">Forstået</button>`;
  }
  localStorage.setItem('noted-last-build', build);
}

function renderStudyHelpStatus() {
  let el = $('#studyHelpStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'studyHelpStatus';
    el.className = 'study-help-status';
    document.querySelector('.app-topbar .topbar-actions')?.prepend(el);
  }
  el.classList.toggle('hidden', studyHelpConnection !== 'local');
  el.textContent = 'Lokal studiehjælp — begrænset kvalitet';
}

function updateSettingsStorageInfo() {
  const storage = $('#settingsStorageMode');
  const sync = $('#settingsSyncMode');
  const help = $('#settingsStudyHelpMode');
  if (storage) storage.textContent = isGuest() ? 'Gemmes ikke — gæstetilstand' : 'Gemmes lokalt på denne enhed';
  if (sync) sync.textContent = isGuest() ? 'Intet gemmes uden profil' : 'Profil + lokal kopi — ingen cloud-sync endnu';
  if (help) help.textContent = studyHelpConnection === 'local' ? 'Lokal fallback (begrænset)' : 'Online via sikker server';
}

function guideStorageKey() {
  const email = activeAccountEmail();
  return email ? accountStorageKey(email, 'guide-done') : 'noted-onboarding-done';
}

function hasCompletedGuide() {
  return localStorage.getItem(guideStorageKey()) === '1';
}

function markGuideCompleted() {
  if (isGuest()) return;
  localStorage.setItem(guideStorageKey(), '1');
}

function shouldShowOnboarding() {
  if (isGuest()) return true;
  return !hasCompletedGuide();
}

let startupGuideQueued = false;

function scheduleStartupGuide(options = {}) {
  const force = Boolean(options.force);
  if (!force && startupGuideQueued) return;
  if (!force && !shouldShowOnboarding()) return;
  startupGuideQueued = true;
  const delay = Number(options.delay) || (force ? 900 : 700);
  setTimeout(() => {
    startupGuideQueued = false;
    if (force || shouldShowOnboarding()) openOnboardingDialog({ auto: true });
  }, delay);
}

function renderOnboardingProgress() {
  const host = $('#onboardingProgress');
  if (!host) return;
  host.innerHTML = STARTUP_GUIDE_STEPS.map((step, index) =>
    `<button type="button" class="chalk-tick ${index === onboardingStep ? 'active' : index < onboardingStep ? 'done' : ''}" data-guide-jump="${index}" aria-label="${escapeHtml(step.title)}" title="${escapeHtml(step.title)}">${index + 1}</button>`
  ).join('');
}

function renderOnboardingStep() {
  const step = STARTUP_GUIDE_STEPS[onboardingStep];
  const body = $('#onboardingStepBody');
  const title = $('#onboardingGuideTitle');
  const illu = $('#onboardingIllustration');
  const stepNum = $('#onboardingStepNum');
  if (!step || !body) return;
  if (title) title.textContent = step.title;
  if (stepNum) stepNum.textContent = String(onboardingStep + 1);
  const stepTotal = $('#onboardingStepTotal');
  if (stepTotal) stepTotal.textContent = String(STARTUP_GUIDE_STEPS.length);
  if (illu) {
    illu.innerHTML = guideBoardSceneSvg(step.scene);
    illu.classList.remove('draw-play');
    void illu.offsetWidth;
    illu.classList.add('draw-play');
  }
  body.innerHTML = `
    <p class="chalk-lead">${step.lead}</p>
    <ul class="chalk-bullet-list">${step.bullets.map((item, index) =>
      `<li class="chalk-bullet" style="--i:${index}"><span class="chalk-bullet-icon">✎</span><span>${item}</span></li>`
    ).join('')}</ul>`;
  renderOnboardingProgress();
  const prev = $('#onboardingPrev');
  const next = $('#onboardingNext');
  if (prev) prev.disabled = onboardingStep === 0;
  if (next) next.textContent = onboardingStep >= STARTUP_GUIDE_STEPS.length - 1 ? '✓ Afslut' : 'Næste →';
}

function showOnboardingIntro() {
  onboardingMode = 'intro';
  $('#onboardingIntro')?.classList.remove('hidden');
  $('#onboardingGuide')?.classList.add('hidden');
  renderGuideIntroArt('welcome');
  document.querySelectorAll('[data-chalk-preview]').forEach(el => el.classList.remove('active'));
}

function showOnboardingGuide() {
  onboardingMode = 'guide';
  $('#onboardingIntro')?.classList.add('hidden');
  $('#onboardingGuide')?.classList.remove('hidden');
  renderOnboardingStep();
}

function setOnboardingStep(step) {
  onboardingStep = Math.max(0, Math.min(STARTUP_GUIDE_STEPS.length - 1, step));
  renderOnboardingStep();
}

function openOnboardingDialog(options = {}) {
  onboardingStep = 0;
  if (options.review) showOnboardingIntro();
  else showOnboardingGuide();
  const dialog = $('#onboardingDialog');
  if (!dialog) return;
  if (dialog.open) dialog.close();
  requestAnimationFrame(() => dialog.showModal());
}

function finishOnboarding() {
  markGuideCompleted();
  $('#onboardingDialog')?.close();
  showOnboardingIntro();
  onboardingStep = 0;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function languageOptions(sel) {
  return languages.map(l => `<option value="${l.code}" ${l.code === sel ? 'selected' : ''}>${l.name}</option>`).join('');
}

function interfaceLanguageOptions(sel) {
  const supported = new Set(['da', 'en', 'sv', 'no', 'fr', 'es']);
  return languages.filter(language => supported.has(language.code))
    .map(language => `<option value="${language.code}" ${language.code === sel ? 'selected' : ''}>${language.name}</option>`).join('');
}

function countryOptions(sel) {
  return countries.map(([code, name]) => `<option value="${code}" ${code === sel ? 'selected' : ''}>${name}</option>`).join('');
}

function studyFieldOptions(selected = 'general') {
  selected = normalizeStudyField(selected);
  return STEM_STUDY_FIELD_IDS.map(id => [id, STUDY_AREA_OPTIONS[id]]).map(([id, field]) =>
    `<option value="${id}" ${id === selected ? 'selected' : ''}>${field.label}</option>`
  ).join('');
}

const DOC_TYPE_I18N = {
  da: {
    general: 'Alm. noter', other: 'Alm.', biology: 'Biologi', tech: 'Datalogi', chemistry: 'Kemi',
    engineering: 'Ingeniørfag', civilEngineering: 'Bygningsingeniør', electricalEngineering: 'Elektroingeniør',
    mechanicalEngineering: 'Maskiningeniør', softwareEngineering: 'Software engineering', biotechnology: 'Bioteknologi', physics: 'Fysik', history: 'Historie',
    humanities: 'Humaniora', culturalStudies: 'Kulturvidenskab', mathematics: 'Matematik', medicine: 'Medicin',
    music: 'Musik', economics: 'Økonomi', languages: 'Sprog', social: 'Samfundsvidenskab', psychology: 'Psykologi',
    health: 'Sundhed', law: 'Jura', statistics: 'Statistik', philosophy: 'Filosofi',
  },
  en: {
    general: 'General notes', other: 'General', biology: 'Biology', tech: 'Computer science', chemistry: 'Chemistry',
    engineering: 'Engineering', civilEngineering: 'Civil engineering', electricalEngineering: 'Electrical engineering',
    mechanicalEngineering: 'Mechanical engineering', softwareEngineering: 'Software engineering', biotechnology: 'Biotechnology', physics: 'Physics', history: 'History',
    humanities: 'Humanities', culturalStudies: 'Cultural studies', mathematics: 'Mathematics', medicine: 'Medicine',
    music: 'Music', economics: 'Economics', languages: 'Languages', social: 'Social science', psychology: 'Psychology',
    health: 'Health', law: 'Law', statistics: 'Statistics', philosophy: 'Philosophy',
  },
  sv: {
    general: 'Allmänna anteckningar', other: 'Allm.', biology: 'Biologi', tech: 'Datavetenskap', chemistry: 'Kemi',
    engineering: 'Ingenjörsvetenskap', civilEngineering: 'Byggingenjör', electricalEngineering: 'Elektroingenjör',
    mechanicalEngineering: 'Maskiningenjör', softwareEngineering: 'Software engineering', biotechnology: 'Bioteknik', physics: 'Fysik', history: 'Historia',
    humanities: 'Humaniora', culturalStudies: 'Kulturstudier', mathematics: 'Matematik', medicine: 'Medicin',
    music: 'Musik', economics: 'Ekonomi', languages: 'Språk', social: 'Samhällsvetenskap', psychology: 'Psykologi',
    health: 'Hälsa', law: 'Juridik', statistics: 'Statistik', philosophy: 'Filosofi',
  },
  no: {
    general: 'Alminnelige notater', other: 'Alm.', biology: 'Biologi', tech: 'Informatikk', chemistry: 'Kjemi',
    engineering: 'Ingeniørfag', civilEngineering: 'Byggingenjør', electricalEngineering: 'Elektroingeniør',
    mechanicalEngineering: 'Maskiningeniør', softwareEngineering: 'Software engineering', biotechnology: 'Bioteknologi', physics: 'Fysikk', history: 'Historie',
    humanities: 'Humaniora', culturalStudies: 'Kulturstudier', mathematics: 'Matematikk', medicine: 'Medisin',
    music: 'Musikk', economics: 'Økonomi', languages: 'Språk', social: 'Samfunnsvitenskap', psychology: 'Psykologi',
    health: 'Helse', law: 'Jus', statistics: 'Statistikk', philosophy: 'Filosofi',
  },
  fr: {
    general: 'Notes générales', other: 'Gén.', biology: 'Biologie', tech: 'Informatique', chemistry: 'Chimie',
    engineering: 'Ingénierie', civilEngineering: 'Génie civil', electricalEngineering: 'Génie électrique',
    mechanicalEngineering: 'Génie mécanique', softwareEngineering: 'Génie logiciel', biotechnology: 'Biotechnologie', physics: 'Physique', history: 'Histoire',
    humanities: 'Humanités', culturalStudies: 'Études culturelles', mathematics: 'Mathématiques', medicine: 'Médecine',
    music: 'Musique', economics: 'Économie', languages: 'Langues', social: 'Sciences sociales', psychology: 'Psychologie',
    health: 'Santé', law: 'Droit', statistics: 'Statistiques', philosophy: 'Philosophie',
  },
  es: {
    general: 'Notas generales', other: 'Gral.', biology: 'Biología', tech: 'Informática', chemistry: 'Química',
    engineering: 'Ingeniería', civilEngineering: 'Ingeniería civil', electricalEngineering: 'Ingeniería eléctrica',
    mechanicalEngineering: 'Ingeniería mecánica', softwareEngineering: 'Ingeniería de software', biotechnology: 'Biotecnología', physics: 'Física', history: 'Historia',
    humanities: 'Humanidades', culturalStudies: 'Estudios culturales', mathematics: 'Matemáticas', medicine: 'Medicina',
    music: 'Música', economics: 'Economía', languages: 'Idiomas', social: 'Ciencias sociales', psychology: 'Psicología',
    health: 'Salud', law: 'Derecho', statistics: 'Estadística', philosophy: 'Filosofía',
  },
};

function docTypeSortLocale() {
  const lang = uiLang();
  return ({ da: 'da', en: 'en', sv: 'sv', no: 'nb', fr: 'fr', es: 'es' })[lang] || 'en';
}

function docTypeDisplayLabel(id) {
  if (uiLang() === 'da') {
    return docTypes[id]?.label || DOC_TYPE_I18N.da[id] || id;
  }
  const lang = uiLang();
  return DOC_TYPE_I18N[lang]?.[id] || DOC_TYPE_I18N.en[id] || docTypes[id]?.label || id;
}

function pageDocTypeLabel(page) {
  if (page?.docType === 'other' && page?.customType?.trim()) return page.customType.trim();
  return docTypeDisplayLabel(page?.docType || 'other');
}

function syncPageOtherTypeField(docType) {
  docType = normalizeDocTypePickerValue(docType || document.querySelector('#docTypeGrid input[name="docType"]:checked')?.value || 'other');
  const field = $('#otherTypeField');
  const input = $('#pageOtherType');
  if (!field) return;
  const isOther = docType === 'other';
  field.classList.toggle('hidden', !isOther);
  if (input) {
    if (isOther) {
      input.removeAttribute('disabled');
      input.setAttribute('required', 'required');
      setTimeout(() => input.focus(), 80);
    } else {
      input.value = '';
      input.removeAttribute('required');
      input.setAttribute('disabled', 'disabled');
    }
  }
}

const DOC_TYPE_GLYPHS = {
  other: '<rect x="5.5" y="4.5" width="13" height="15" rx="1"/><path d="M8.5 9h7M8.5 12h7M8.5 15h4.5"/>',
  biology: '<path d="M9 4.5c2 2.8 2 5.6 0 8.4s-2 5.6 0 8.4"/><path d="M15 4.5c-2 2.8-2 5.6 0 8.4s2 5.6 0 8.4"/><path d="M9 7.5h6M9 12h6M9 16.5h6"/>',
  tech: '<path d="M8 8.5 4.5 12 8 15.5"/><path d="M16 8.5 19.5 12 16 15.5"/><path d="M13.5 7l-3 10"/>',
  softwareEngineering: '<path d="M8 8.5 4.5 12 8 15.5"/><path d="M16 8.5 19.5 12 16 15.5"/><path d="M9.5 18.5h5"/><path d="M12 5.5v13"/>',
  chemistry: '<path d="M10 4.5h4"/><path d="M11.5 4.5V10l-3.5 7h9l-3.5-7V4.5"/><path d="M8 17h8"/>',
  engineering: '<circle cx="12" cy="12" r="3.2"/><path d="M12 5.2v2M12 16.8v2M5.2 12h2M16.8 12h2"/><path d="M7.6 7.6l1.4 1.4M15 15l1.4 1.4M7.6 16.4l1.4-1.4M15 9l1.4-1.4"/>',
  civilEngineering: '<path d="M6.5 19.5V10.5L12 7l5.5 3.5v9"/><path d="M9.5 19.5v-4.5h5v4.5"/><path d="M11 13.5h2"/>',
  electricalEngineering: '<path d="M13.2 4.5 9.2 13h3.8l-1.8 6.5 6.3-8.5h-3.8l1.5-6.5z"/>',
  mechanicalEngineering: '<path d="M12 5.2 16.5 8v6l-4.5 2.8L7.5 14V8z"/><circle cx="12" cy="10.5" r="2"/>',
  biotechnology: '<ellipse cx="12" cy="14.5" rx="7.5" ry="3.5"/><path d="M4.5 14.5v1.8c0 2 3.4 3.7 7.5 3.7s7.5-1.7 7.5-3.7v-1.8"/><path d="M8 10.5h8"/>',
  physics: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="8.5" ry="3.8"/><ellipse cx="12" cy="12" rx="8.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="8.5" ry="3.8" transform="rotate(-60 12 12)"/>',
  history: '<path d="M7.5 6.2c0-1.1 1-2 2.8-2h3.4c1.8 0 2.8.9 2.8 2v11.6c0 1.1-1 2-2.8 2H10.3c-1.8 0-2.8-.9-2.8-2z"/><path d="M7.5 6.2v11.6"/><path d="M10.2 10h3.6M10.2 13.5h2.8"/>',
  humanities: '<path d="M4.5 6.5v12.5c2.2-1 4.2-1 7.5 0"/><path d="M19.5 6.5v12.5c-2.2-1-4.2-1-7.5 0"/><path d="M12 6.5v12.5"/>',
  culturalStudies: '<path d="M12 5.5c-3.8 0-6.8 2.8-6.8 6.3 0 2.8 2.8 4.9 6.8 4.9s6.8-2.1 6.8-4.9c0-3.5-3-6.3-6.8-6.3z"/><circle cx="9.3" cy="11.2" r=".9" fill="currentColor" stroke="none"/><circle cx="14.7" cy="11.2" r=".9" fill="currentColor" stroke="none"/><path d="M10.2 14.8c1 1 2.6 1 3.6 0"/>',
  mathematics: '<path d="M5.5 18.5h13"/><path d="M5.5 18.5 12 5.5"/><path d="M12 5.5v13"/>',
  medicine: '<rect x="5.5" y="5.5" width="13" height="13" rx="2"/><path d="M12 8.5v7M8.5 12h7"/>',
  music: '<circle cx="8.2" cy="16.8" r="2"/><path d="M10.2 16.8V7.2"/><path d="M10.2 7.2h5.8"/>',
  economics: '<path d="M5.5 18.5V11M10 18.5V7.5M14.5 18.5V9.5M19 18.5V5.5"/><path d="M4.5 18.5h15"/>',
  languages: '<path d="M6.2 6.5h11.6v7.5H10.2l-3.5 3v-10.5z"/><path d="M9.2 9.5h5.6M9.2 11.8h3.8"/>',
  social: '<circle cx="12" cy="12" r="7.5"/><ellipse cx="12" cy="12" rx="3.8" ry="7.5"/><path d="M4.5 12h15"/><path d="M6.2 8.5h11.6M6.2 15.5h11.6"/>',
  psychology: '<path d="M8.2 6.8C6.4 8.2 5.5 10 5.5 12s.9 3.8 2.7 5.2"/><path d="M15.8 6.8c1.8 1.4 2.7 3.2 2.7 5.2s-.9 3.8-2.7 5.2"/><path d="M9.2 8.8c.8 1.2 1.2 2.5 1.2 3.2s-.4 2-1.2 3.2"/><path d="M14.8 8.8c-.8 1.2-1.2 2.5-1.2 3.2s.4 2 1.2 3.2"/><path d="M12 6.8v10.4"/>',
  health: '<rect x="6.5" y="10.2" width="11" height="5.6" rx="2.8"/><path d="M12 10.2v5.6"/>',
  law: '<path d="M12 4.5v14"/><path d="M6.5 8.5h11"/><path d="M6.5 8.5 4 13.5h5z"/><path d="M17.5 8.5 15 13.5h5z"/><path d="M9.5 18.5h5"/>',
  statistics: '<path d="M5 16.5c2.2-5.5 4.2-7.5 7-7.5s4.8 2 7 7.5"/><path d="M4.5 16.5h15"/>',
  philosophy: '<circle cx="12" cy="5.5" r="2"/><path d="M12 7.5v3.5"/><path d="M8.5 17.5l3.5-6 3.5 6"/><path d="M8.5 17.5h7"/>',
};

const DOC_TYPE_STICKER = {
  other: { bg: '#f4dfa2', rot: -2.4 },
  biology: { bg: '#d8edd8', rot: 1.6 },
  tech: { bg: '#c5dceb', rot: -1.1 },
  softwareEngineering: { bg: '#d2e6f4', rot: 1.7 },
  chemistry: { bg: '#e8dff5', rot: 2.2 },
  engineering: { bg: '#dce4f0', rot: -1.8 },
  civilEngineering: { bg: '#e6ddd0', rot: 1.3 },
  electricalEngineering: { bg: '#fff0c2', rot: -2.1 },
  mechanicalEngineering: { bg: '#d9e2ea', rot: 0.9 },
  biotechnology: { bg: '#d4f0e0', rot: -0.7 },
  physics: { bg: '#dbe8f4', rot: 2.5 },
  history: { bg: '#f0e2c8', rot: -1.4 },
  humanities: { bg: '#f5e6dc', rot: 1.9 },
  culturalStudies: { bg: '#f3dce8', rot: -2.6 },
  mathematics: { bg: '#e3edf7', rot: 0.6 },
  medicine: { bg: '#f8dde2', rot: -0.5 },
  music: { bg: '#efe0f5', rot: 2.0 },
  economics: { bg: '#dff0e8', rot: -1.7 },
  languages: { bg: '#fce8d4', rot: 1.1 },
  social: { bg: '#dcefe8', rot: -2.3 },
  psychology: { bg: '#f2dce8', rot: 1.5 },
  health: { bg: '#f5dfe5', rot: -0.9 },
  law: { bg: '#ebe4d6', rot: 2.4 },
  statistics: { bg: '#e0eaf5', rot: 1.2 },
  philosophy: { bg: '#efe6dc', rot: -1.6 },
};

function docTypeGlyphSvg(id, className = 'doc-type-sticker-glyph') {
  const inner = DOC_TYPE_GLYPHS[id] || DOC_TYPE_GLYPHS.other;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

const DOC_TYPE_STEM_BOARD = [
  { title: 'Science', tone: 'science', icon: '⌬', ids: ['physics', 'chemistry', 'biology', 'biotechnology'] },
  { title: 'Tech', tone: 'tech', icon: '</>', ids: ['tech', 'softwareEngineering'] },
  { title: 'Engineering', tone: 'engineering', icon: '⚙', ids: ['engineering', 'electricalEngineering', 'mechanicalEngineering', 'civilEngineering'] },
  { title: 'Maths', tone: 'math', icon: '∑', ids: ['mathematics', 'statistics'] },
  { title: 'Mind', tone: 'psych', icon: 'Ψ', ids: ['psychology'] },
];

const DOC_TYPE_STEM_IDS = DOC_TYPE_STEM_BOARD.flatMap(section => section.ids);

function docTypePickerIds() {
  return DOC_TYPE_STEM_IDS.filter(id => docTypes[id]);
}

function normalizeDocTypePickerValue(value = 'other') {
  if (value === 'general' || value === 'other') return 'mathematics';
  if (!DOC_TYPE_STEM_IDS.includes(value)) return 'mathematics';
  return value;
}

function docTypeStickerMeta(id) {
  const sticker = DOC_TYPE_STICKER[id] || {};
  return {
    bg: sticker.bg || '#f4dfa2',
    rot: sticker.rot ?? 0,
  };
}

function docTypeStickerHtml(id, selected = false) {
  const cfg = docTypes[id];
  if (!cfg) return '';
  const { bg, rot } = docTypeStickerMeta(id);
  return `<label class="doc-type-sticker${selected ? ' active' : ''}" style="--sticker-bg:${bg};--sticker-rot:${rot}deg">
    <input type="radio" name="docType" value="${id}" ${selected ? 'checked' : ''} hidden>
    ${docTypeGlyphSvg(id)}
    <b>${escapeHtml(docTypeDisplayLabel(id))}</b>
  </label>`;
}

function renderDocTypePicker(selected = 'other') {
  const host = $('#docTypeGrid');
  if (!host) return;
  selected = normalizeDocTypePickerValue(selected);
  const selectedLabel = docTypeDisplayLabel(selected);
  host.className = 'category-picker doc-type-category-picker doc-type-sticker-board';
  host.innerHTML = `
    <div class="category-selection-summary">
      <span>Valgt STEM-fag</span>
      <b data-doc-type-summary>${escapeHtml(selectedLabel)}</b>
    </div>
    <p class="category-picker-hint">Tryk på Science, Tech, Engineering eller Maths, og vælg derefter faget under kategorien.</p>
    ${DOC_TYPE_STEM_BOARD.map((section, index) => {
      const ids = section.ids.filter(id => docTypes[id]);
      const hasSelected = ids.includes(selected);
      return `<section class="doc-category tone-${section.tone}${hasSelected ? ' has-selection open' : ''}" data-doc-category="doc-${index}">
        <button type="button" class="doc-category-head" aria-expanded="${hasSelected ? 'true' : 'false'}">
          <span class="doc-category-icon">${section.icon}</span>
          <span class="doc-category-copy"><b>${escapeHtml(section.title)}</b><small>${ids.length} fag</small></span>
          <span class="doc-category-chevron" aria-hidden="true">${hasSelected ? '−' : '+'}</span>
        </button>
        <div class="doc-category-body" ${hasSelected ? '' : 'hidden'}>
          <div class="doc-type-sticker-grid">${ids.map(id => docTypeStickerHtml(id, id === selected)).join('')}</div>
        </div>
      </section>`;
    }).join('')}`;
}

function initDocCategoryPicker() {
  if (document.body.dataset.categoryPickerReady) return;
  document.body.dataset.categoryPickerReady = '1';
  document.addEventListener('click', event => {
    const head = event.target.closest('.category-picker .doc-category-head');
    if (head) {
      const host = head.closest('.category-picker');
      const section = head.closest('.doc-category');
      const wasOpen = section.classList.contains('open');
      host?.querySelectorAll('.doc-category').forEach(row => {
        row.classList.remove('open');
        row.querySelector('.doc-category-body')?.setAttribute('hidden', '');
        row.querySelector('.doc-category-head')?.setAttribute('aria-expanded', 'false');
        const chev = row.querySelector('.doc-category-chevron');
        if (chev) chev.textContent = '+';
      });
      if (!wasOpen) {
        section.classList.add('open');
        section.querySelector('.doc-category-body')?.removeAttribute('hidden');
        head.setAttribute('aria-expanded', 'true');
        const chev = head.querySelector('.doc-category-chevron');
        if (chev) chev.textContent = '−';
      }
      return;
    }
    const studyTile = event.target.closest('.category-picker .study-tile');
    if (studyTile) {
      const host = studyTile.closest('.category-picker');
      const fieldId = studyTile.dataset.studyField;
      host?.querySelectorAll('.study-tile').forEach(el => {
        const active = el === studyTile;
        el.classList.toggle('active', active);
        el.setAttribute('aria-pressed', String(active));
      });
      if (host?.id) {
        const summary = host.querySelector('[data-study-summary]');
        if (summary && fieldId) summary.textContent = STUDY_AREA_OPTIONS[fieldId]?.label || fieldId;
      }
      if (host) host.dataset.selected = fieldId || host.dataset.selected;
    }
  });
}

const DEFAULT_WIDGET_AI = [
  { icon: '?', label: 'Forklar', action: 'explain', hint: 'Gør teksten lettere' },
  { icon: '≡', label: 'Resumé', action: 'summarize', hint: 'Find hovedpointerne' },
  { icon: '✓', label: 'Test mig', action: 'questions', hint: 'Lav spørgsmål' },
  { icon: 'Aa', label: 'Ret tekst', action: 'proofread', hint: 'Sprog og formulering' },
  { icon: '◎', label: 'Forstår jeg det?', action: 'understood', hint: 'Forståelsestjek' },
  { icon: '→', label: 'Trin for trin', action: 'derive', hint: 'Vis fremgangsmåden' },
];

function studyFieldCardHtml(id, selected = false) {
  const field = STUDY_AREA_OPTIONS[id];
  if (!field) return '';
  const solo = id === 'general';
  return `<button type="button" class="study-tile tone-${field.tone}${solo ? ' study-tile-solo' : ''} ${selected ? 'active' : ''}" data-study-field="${id}" aria-pressed="${selected}">
    <span class="study-tile-icon">${field.icon}</span>
    <b>${escapeHtml(field.label)}</b>
  </button>`;
}

function renderStudyFieldPicker(host, selected = 'general') {
  if (!host) return;
  selected = normalizeStudyField(selected);
  const selectedLabel = STUDY_AREA_OPTIONS[selected]?.label || 'Andet';
  host.className = 'category-picker study-field-picker landing-study-options';
  host.innerHTML = `
    <div class="category-selection-summary">
      <span>Valgt studieområde</span>
      <b data-study-summary>${escapeHtml(selectedLabel)}</b>
    </div>
    <p class="category-picker-hint">Tryk på en kategori — fagene folder ud under den</p>
    ${STUDY_FIELD_BOARD.map((section, index) => {
      const tiles = section.ids.filter(id => STUDY_AREA_OPTIONS[id]).map(id => studyFieldCardHtml(id, id === selected)).join('');
      if (section.solo) {
        return `<div class="doc-category-solo">${tiles}</div>`;
      }
      const count = section.ids.filter(id => STUDY_AREA_OPTIONS[id]).length;
      const hasSelected = section.ids.includes(selected);
      const catId = `study-${index}`;
      return `<section class="doc-category tone-${section.tone}${hasSelected ? ' has-selection' : ''}" data-doc-category="${catId}">
        <button type="button" class="doc-category-head" aria-expanded="false">
          <span class="doc-category-icon">${section.ids.map(id => STUDY_AREA_OPTIONS[id]?.icon).find(Boolean) || '▤'}</span>
          <span class="doc-category-copy"><b>${escapeHtml(section.title || '')}</b><small>${count} fag</small></span>
          <span class="doc-category-chevron" aria-hidden="true">+</span>
        </button>
        <div class="doc-category-body" hidden>
          <div class="doc-category-grid">${tiles}</div>
        </div>
      </section>`;
    }).join('')}`;
  host.dataset.selected = selected;
}

function renderLandingStudyPicker() {
  const host = $('#landingStudyOptions');
  if (!host) return;
  renderStudyFieldPicker(host, 'mathematics');
}

function syncStudyFieldPicker(host, value, hiddenInput) {
  if (!host) return;
  const normalized = normalizeStudyField(value || 'mathematics');
  renderStudyFieldPicker(host, normalized);
  if (hiddenInput) hiddenInput.value = normalized;
  host.querySelectorAll('[data-study-field]').forEach(btn => {
    const active = btn.dataset.studyField === normalized;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function bindStudyFieldPicker(host, hiddenInput) {
  if (!host || host.dataset.bound) return;
  host.dataset.bound = '1';
  host.addEventListener('click', event => {
    const card = event.target.closest('[data-study-field]');
    if (!card) return;
    host.querySelectorAll('[data-study-field]').forEach(btn => {
      const active = btn === card;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    host.dataset.selected = card.dataset.studyField;
    if (hiddenInput) hiddenInput.value = card.dataset.studyField;
  });
}

function initInteractiveToolFeedback() {
  if (document.body.dataset.toolFeedbackReady) return;
  document.body.dataset.toolFeedbackReady = '1';
  const selector = '.tool, .study-help-grid button, .fag-tool-btn, .side-tool-buttons button, .capability-item, .doc-type-card, .doc-type-sticker, .doc-subject-tile, .doc-category-head, .study-tile, .tool-pack-card, [data-widget-ai], [data-widget-tool], [data-side-action], .landing-study-options button, .pdf-drop-zone, .continue-card > button';
  document.addEventListener('click', event => {
    const target = event.target.closest(selector);
    if (!target || target.disabled) return;
    target.classList.add('tool-pressed');
    window.setTimeout(() => target.classList.remove('tool-pressed'), 180);
  });
}

function route() {
  const previewMode = new URLSearchParams(location.search).get('noteitPreview');
  if (previewMode) {
    activateScreenshotPreviewWorkspace();
    if (!location.hash.startsWith('#/app')) {
      location.hash = '#/app';
      return;
    }
  }
  if (location.hash.startsWith('#/app')) {
    if (!getSession()) {
      location.hash = '';
      $('#welcomeDialog')?.showModal();
      return;
    }
    if (!appBooted) {
      data.ui.view = previewMode === 'note' ? 'home' : 'notebook';
      appBooted = true;
    }
    if (shouldShowOnboarding()) scheduleStartupGuide();
    $('#landing').classList.add('hidden');
    $('#app').classList.add('active');
    render();
  } else {
    appBooted = false;
    $('#landing').classList.remove('hidden');
    $('#app').classList.remove('active');
  }
}

function goApp() {
  if (getSession()) {
    location.hash = '#/app';
    route();
    return;
  }
  openAuthDialog('login');
}

function getAccounts() {
  try { return JSON.parse(localStorage.getItem('noteit-accounts') || '[]'); } catch { return []; }
}

function loadAccountState(account) {
  if (!account || account.guest) return;
  const read = (area, fallback, defaultValue) => {
    try {
      return JSON.parse(localStorage.getItem(accountStorageKey(account.email, area)) || localStorage.getItem(fallback) || defaultValue);
    } catch {
      return JSON.parse(defaultValue);
    }
  };
  data = normalize(read('workspace', STORAGE_KEY, JSON.stringify(blank)));
  appSettings = {
    interfaceLanguage: 'da', defaultLanguage: 'da', country: 'DK', autoCorrect: true, studyField: 'mathematics',
    ...read('settings', 'stemnotes-settings', '{}'),
    ...(account.settings || {}),
  };
  appSettings.studyField = normalizeStudyField(appSettings.studyField);
  appSettings.apiBase = String(appSettings.apiBase || localStorage.getItem('noteit-api-base') || '').replace(/\/$/, '');
  if (!Array.isArray(appSettings.recentTools)) appSettings.recentTools = [];
  examData = read('exams', 'stemnotes-exams', '{"subjects":[],"start":"","plan":[],"checks":{},"folders":[],"trainingResults":[],"rewardedPeriods":[],"selfNotes":[]}');
  ensureExamDataShape();
  rewardData = read('rewards', 'noteit-rewards', '{"points":10,"earned":0,"redeemed":0,"codes":[]}');
  rewardData.points = Number(rewardData.points) || 10;
}

function initializeAccountState(account) {
  const initialWorkspace = JSON.stringify(normalize(structuredClone(blank)));
  const initialExams = JSON.stringify({ subjects: [], start: '', plan: [], checks: {}, folders: [], trainingResults: [], rewardedPeriods: [], selfNotes: [], view: 'checklist' });
  const initialRewards = JSON.stringify({ points: 10, earned: 0, redeemed: 0, codes: [] });
  localStorage.setItem(accountStorageKey(account.email, 'workspace'), initialWorkspace);
  localStorage.setItem(accountStorageKey(account.email, 'settings'), JSON.stringify(account.settings || {}));
  localStorage.setItem(accountStorageKey(account.email, 'exams'), initialExams);
  localStorage.setItem(accountStorageKey(account.email, 'rewards'), initialRewards);
}

function getSession() {
  const email = localStorage.getItem('noteit-session');
  if (email) return getAccounts().find(account => normalizedEmail(account.email) === normalizedEmail(email)) || null;
  if (sessionStorage.getItem('noted-guest') === 'yes') {
    return { name: 'Gæst', email: '', guest: true, settings: { country: 'DK', interfaceLanguage: 'da', defaultLanguage: 'da', autoCorrect: false } };
  }
  return null;
}

function isGuest() {
  return getSession()?.guest === true;
}

function getActivePremiumSubscription(account) {
  if (!account || account.guest) return null;
  const sub = account.subscription;
  if (!sub?.active) return null;
  if (sub.expiresAt && new Date(sub.expiresAt).getTime() <= Date.now()) {
    sub.active = false;
    localStorage.setItem('noteit-accounts', JSON.stringify(getAccounts()));
    return null;
  }
  return sub;
}

function premiumDaysRemaining(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  const now = new Date();
  const end = new Date(expiresAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.round((endDay - today) / 86400000));
}

function premiumDisplayLabel(subscription) {
  if (!subscription?.active) return '';
  if (!subscription.expiresAt) return 'Premium';
  const days = premiumDaysRemaining(subscription.expiresAt);
  if (days <= 0) return '';
  return days === 1 ? 'Premium 1 dag' : `Premium ${days} dage`;
}

function hasPremium() {
  return true;
}

function usageRecord() {
  const session = getSession();
  if (!session || session.guest) return { pdf: 0, understanding: 0 };
  session.usage ||= { pdf: 0, understanding: 0 };
  return session.usage;
}

function updateCurrentAccount(mutator) {
  const session = getSession();
  if (!session || session.guest) return null;
  const accounts = getAccounts();
  const account = accounts.find(item => normalizedEmail(item.email) === normalizedEmail(session.email));
  if (!account) return null;
  mutator(account);
  localStorage.setItem('noteit-accounts', JSON.stringify(accounts));
  return account;
}

function requireLogin(message = 'Log ind eller opret en bruger for at bruge denne funktion.') {
  return true;
}

function requireStudyHelp() {
  if (!activePage()) {
    alert('Åbn et dokument først.');
    return false;
  }
  return true;
}

function openPremiumDialog(message) {
  const hint = $('#premiumLoginHint');
  if (hint) {
    hint.textContent = message || (isGuest()
      ? 'Log ind eller opret en profil for at vælge Premium.'
      : 'Abonnementet knyttes til din profil og åbner gruppe og projektværktøjerne.');
  }
  return true;
}

function requirePremium(message) {
  return true;
}

function requireExamTrainingPremium() {
  return requirePremium(isGuest()
    ? 'Log ind og opret Premium for at bruge eksamenstræning.'
    : 'Eksamenstræning kræver Note\'it Premium. Opret abonnement for at træne ud fra dit pensum og dine noter.');
}

function activatePremium(plan) {
  const session = getSession();
  if (!session || session.guest) {
    $('#premiumDialog')?.close();
    openAuthDialog('signup');
    return;
  }
  const accounts = getAccounts();
  const account = accounts.find(item => normalizedEmail(item.email) === normalizedEmail(session.email));
  if (!account) return;
  account.subscription = {
    active: true,
    plan,
    started: new Date().toISOString(),
    expiresAt: plan === 'semester'
      ? new Date(Date.now() + 183 * 86400000).toISOString()
      : new Date(Date.now() + 31 * 86400000).toISOString(),
  };
  localStorage.setItem('noteit-accounts', JSON.stringify(accounts));
  $('#premiumDialog')?.close();
  renderProfileStatus();
}

function redeemAccessCode(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  const offer = NOTED_ACCESS_CODES[code];
  const feedback = $('#premiumCodeFeedback');
  if (!offer) {
    if (feedback) feedback.textContent = 'Koden blev ikke genkendt.';
    return;
  }
  if (isGuest() || !getSession()) {
    $('#premiumDialog')?.close();
    openAuthDialog('signup');
    return;
  }
  const account = updateCurrentAccount(current => {
    current.redeemedCodes ||= [];
    if (!current.redeemedCodes.includes(code)) current.redeemedCodes.push(code);
    if (offer.discountPercent) {
      current.discountPercent = Math.max(Number(current.discountPercent) || 0, offer.discountPercent);
      return;
    }
    current.subscription = {
      active: true,
      plan: offer.plan,
      started: new Date().toISOString(),
      expiresAt: offer.lifetime ? null : new Date(Date.now() + offer.days * 86400000).toISOString(),
    };
  });
  if (!account) return;
  if (feedback) feedback.textContent = offer.discountPercent
    ? `${offer.label} er gemt på din profil.`
    : `${offer.label} er aktiveret.`;
  renderProfileStatus();
}

function noteExamCards(page) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = page?.html || '';
  wrapper.querySelectorAll('script,style,.math-render[aria-hidden="true"]').forEach(element => element.remove());
  const cards = [];
  const headings = [...wrapper.querySelectorAll('h1,h2,h3')];
  headings.forEach(heading => {
    const answerParts = [];
    let next = heading.nextElementSibling;
    while (next && !/^H[1-3]$/.test(next.tagName) && answerParts.join(' ').length < 650) {
      const text = next.textContent?.trim();
      if (text) answerParts.push(text);
      next = next.nextElementSibling;
    }
    const answer = answerParts.join('\n').trim();
    if (heading.textContent.trim() && answer) {
      cards.push({ question: `Forklar: ${heading.textContent.trim()}`, answer });
    }
  });
  if (cards.length < 3) {
    const text = wrapper.textContent.replace(/\s+/g, ' ').trim();
    const sentences = text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.length > 25);
    sentences.forEach((sentence, index) => {
      if (cards.length >= 16) return;
      const words = sentence.split(/\s+/);
      const key = words.slice(0, Math.min(7, words.length)).join(' ');
      cards.push({
        question: index % 2 ? `Hvad er hovedpointen i dette afsnit?` : `Forklar med egne ord: ${key}…`,
        answer: sentence,
      });
    });
  }
  return cards.slice(0, 20);
}

function renderNoteExamCard() {
  const card = noteExamState.cards[noteExamState.index];
  const host = $('#noteExamCard');
  if (!host || !card) return;
  const total = noteExamState.cards.length;
  $('#noteExamProgressText').textContent = `Kort ${noteExamState.index + 1} af ${total}`;
  $('#noteExamProgressBar').style.width = `${((noteExamState.index + 1) / total) * 100}%`;
  $('#previousNoteExamCard').disabled = noteExamState.index === 0;
  $('#nextNoteExamCard').disabled = noteExamState.index === total - 1;
  $('#revealNoteExamCard').textContent = noteExamState.revealed ? 'Skjul svar' : 'Vis svar';
  host.innerHTML = `<article class="note-exam-flashcard ${noteExamState.revealed ? 'revealed' : ''}">
    <span>SPØRGSMÅL</span><h3>${escapeHtml(card.question)}</h3>
    <div class="note-exam-answer"><small>SVAR FRA DIN NOTE</small><p>${escapeHtml(card.answer).replace(/\n/g, '<br>')}</p></div>
  </article>`;
}

function openNoteExamMode() {
  const page = activePage();
  if (!page) return alert('Åbn en note først.');
  syncActiveSheet();
  const cards = noteExamCards(page);
  if (!cards.length) return alert('Skriv lidt mere i noten, før du starter eksamensmode.');
  noteExamState = { cards, index: 0, revealed: false };
  $('#noteExamModeTitle').textContent = page.title || 'Træn på denne note';
  renderNoteExamCard();
  $('#noteExamModeDialog').showModal();
}

async function legacyPasswordHash(password) {
  if (!crypto.subtle) return btoa(unescape(encodeURIComponent(password)));
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function passwordSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function passwordHash(password, salt) {
  if (!salt) return legacyPasswordHash(password);
  if (!crypto.subtle) return legacyPasswordHash(`${salt}:${password}`);
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: new TextEncoder().encode(salt),
    iterations: 120000,
  }, material, 256);
  return [...new Uint8Array(bits)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function applyProfile(account) {
  if (!account) return;
  appSettings = { ...appSettings, ...(account.settings || {}) };
  if (!account.guest) {
    const settings = JSON.stringify(appSettings);
    localStorage.setItem('stemnotes-settings', settings);
    localStorage.setItem(accountStorageKey(account.email, 'settings'), settings);
  }
  applyUiLanguage();
}

function startGuestDemo() {
  guestEditReady = false;
  aiSettings = { model: 'gpt-4.1-mini' };
  appSettings.studyField = 'mathematics';
  data = normalize({
    semesters: [], subjects: [], pages: [], projects: [], groups: [],
    resources: [],
    currentSubject: null,
    currentPage: null,
    ui: { projectsOpen: false, resourcesOpen: false, widgetsOpen: true, toolbarExpanded: false, capabilitiesFirstOpen: false, programOpen: {}, semesterOpen: {}, subjectOpen: {}, view: 'notebook', notebookIndex: 0 },
  });
  examData = { subjects: [], start: '', plan: [], checks: {}, folders: [], trainingResults: [], rewardedPeriods: [], selfNotes: [], view: 'checklist' };
  ensureExamDataShape();
  setTimeout(() => {
    if (!isGuest()) return;
    guestEditReady = true;
    $('#guestSaveNotice')?.classList.remove('visible');
  }, 1000);
}

function activateScreenshotPreviewWorkspace() {
  if (sessionStorage.getItem('noteit-preview-ready') === '1') return;
  const email = 'preview@noteit.local';
  const accountKey = area => accountStorageKey(email, area);
  const now = new Date().toISOString();
  const noteHtml = `<h1>Computer Science</h1><h2>Forelæsning 2 – Algoritmer</h2><p><br></p><h2>1. Hvad er en algoritme?</h2><p>En algoritme er en endelig sekvens af præcise instruktioner, der løser et problem.</p><p><b>Egenskaber</b></p><ul><li>Input</li><li>Output</li><li>Endelighed</li><li>Entydighed</li><li>Effektivitet</li></ul><h2>2. Eksempel: Lineær søgning</h2><div class="code-block" data-language="Python" contenteditable="false"><pre><code contenteditable="true">print(&quot;Hello, world!&quot;)</code></pre></div><p>Tidskompleksitet: <b>O(n)</b> i værste fald.</p>`;
  const workspace = normalize({
    semesters: [{ id: 'sem-cs', name: 'Computer Science', program: 'master', year: 1, color: '#8d6fa2' }],
    subjects: [
      { id: 'sub-k', semesterId: 'sem-cs', name: 'k', color: '#9eaa88' },
      { id: 'sub-math', semesterId: 'sem-cs', name: 'Matematik', color: '#8d6fa2' },
      { id: 'sub-db', semesterId: 'sem-cs', name: 'Database', color: '#9b83af' },
      { id: 'sub-se', semesterId: 'sem-cs', name: 'Software Engineering', color: '#8d6fa2' },
    ],
    pages: [{
      id: 'page-algo', subjectId: 'sub-k', title: 'Forelæsning 2 – Algoritmer', deadline: '',
      created: now, updated: now, language: 'da', html: noteHtml, comments: [],
      docType: 'tech', customType: '', expectations: 1, goal: '', factCheck: false,
      autoCorrect: true, proofreading: true, classLevel: 'universitet',
      pageView: 'continuous', paperCorners: 'round', paperZoom: 100, paperPattern: 'dots',
      sheets: [noteHtml], sheetTitles: ['Forelæsning 2'], currentSheet: 0,
      toolPacks: ['stem'], sheetTrash: [],
    }],
    trash: [], projects: [], groups: [], resources: [],
    currentSubject: 'sub-k', currentPage: 'page-algo',
    ui: { projectsOpen: false, resourcesOpen: false, widgetsOpen: true, toolbarExpanded: true, capabilitiesFirstOpen: false, programOpen: {}, semesterOpen: { 'sem-cs': true }, subjectOpen: { 'sub-k': true }, view: 'home', notebookIndex: 0 },
  });
  localStorage.setItem('noteit-accounts', JSON.stringify([{ name: 'Sandra Kildemose Jørgensen', email, createdAt: now, settings: { country: 'DK', interfaceLanguage: 'da', defaultLanguage: 'da', autoCorrect: true, studyField: 'tech' } }]));
  localStorage.setItem('noteit-session', email);
  localStorage.setItem(accountKey('workspace'), JSON.stringify(workspace));
  localStorage.setItem(accountKey('settings'), JSON.stringify({ country: 'DK', interfaceLanguage: 'da', defaultLanguage: 'da', autoCorrect: true, studyField: 'tech' }));
  localStorage.setItem(accountKey('exams'), JSON.stringify({ subjects: [], start: '', plan: [], checks: {}, folders: [], trainingResults: [], rewardedPeriods: [], selfNotes: [], view: 'checklist' }));
  localStorage.setItem(accountKey('rewards'), JSON.stringify({ points: 10, earned: 0, redeemed: 0, codes: [] }));
  localStorage.setItem(accountKey('guide-done'), '1');
  sessionStorage.setItem('noteit-preview-ready', '1');
}

function saveSettingsToProfile() {
  const session = getSession();
  if (!session) return;
  const accounts = getAccounts();
  const account = accounts.find(item => normalizedEmail(item.email) === normalizedEmail(session.email));
  if (!account) return;
  account.settings = {
    country: appSettings.country,
    interfaceLanguage: appSettings.interfaceLanguage,
    defaultLanguage: appSettings.defaultLanguage,
    autoCorrect: appSettings.autoCorrect,
    studyField: appSettings.studyField,
  };
  localStorage.setItem('noteit-accounts', JSON.stringify(accounts));
  localStorage.setItem(accountStorageKey(account.email, 'settings'), JSON.stringify(account.settings));
}

function openAuthDialog(tab = 'login') {
  $('#signupCountry').innerHTML = countryOptions('DK');
  $('#signupInterfaceLanguage').innerHTML = interfaceLanguageOptions('da');
  $('#signupNoteLanguage').innerHTML = languageOptions('da');
  const signupField = $('#signupStudyField');
  if (signupField) signupField.innerHTML = studyFieldOptions('mathematics');
  syncStudyFieldPicker($('#signupStudyFieldGrid'), signupField?.value || 'mathematics', signupField);
  bindStudyFieldPicker($('#signupStudyFieldGrid'), signupField);
  document.querySelectorAll('[data-auth-tab]').forEach(button => button.classList.toggle('active', button.dataset.authTab === tab));
  document.querySelectorAll('[data-auth-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.authPanel === tab));
  $('#loginError').textContent = '';
  $('#signupError').textContent = '';
  const loginEmail = $('#loginEmail');
  const rememberSaved = localStorage.getItem(REMEMBER_LOGIN_KEY) === '1';
  const savedEmail = localStorage.getItem(LAST_LOGIN_EMAIL_KEY) || '';
  const hintEmail = localStorage.getItem(LOGIN_EMAIL_HINT_KEY) || '';
  if (loginEmail) {
    loginEmail.placeholder = savedEmail || hintEmail || 'din@email.dk';
    loginEmail.value = rememberSaved && savedEmail ? savedEmail : '';
  }
  const rememberCheckbox = $('#loginRememberEmail');
  if (rememberCheckbox) rememberCheckbox.checked = rememberSaved;
  const dialog = $('#welcomeDialog');
  if (!dialog) return;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector(tab === 'signup' ? '#signupName' : '#loginEmail')?.focus();
}

function initLanding() {
  $('#landing')?.addEventListener('click', e => {
    const button = e.target.closest('[data-goto-app]');
    if (!button) return;
    e.preventDefault();
    goApp();
  });
  $('#landingLanguage')?.addEventListener('change', e => applyLandingLanguage(e.target.value));
  renderLandingStudyPicker();
  document.querySelector('.landing-study-options')?.addEventListener('click', e => {
    const choice = e.target.closest('[data-study-field]');
    if (!choice) return;
    openAuthDialog('signup');
    syncStudyFieldPicker($('#signupStudyFieldGrid'), choice.dataset.studyField, $('#signupStudyField'));
  });
  const journeyCopy = {
    '01': ['01 · Skriv noter', 'Start med et fag, og saml dine forelæsninger i en notesbog, der følger dit semester.'],
    '02': ['02 · Planlæg eksamen', 'Tilføj eksamensdato, pensum og dine egne noter, så læsearbejdet fordeles realistisk.'],
    '03': ['03 · Læs efter planen', 'Hver læseopgave peger direkte på de noter og materialer, du skal bruge den dag.'],
    '04': ['04 · Træn aktivt', 'Gør dine egne noter til flashcards, spørgsmål og korte prøver, når du er klar.'],
    '05': ['05 · Følg fremdriften', 'Se hvilke emner du har arbejdet med, og hvor du med fordel kan repetere.'],
  };
  document.querySelector('.journey-note-stack')?.addEventListener('click', e => {
    const note = e.target.closest('[data-journey-note]');
    if (!note) return;
    document.querySelectorAll('[data-journey-note]').forEach(item => item.classList.toggle('active', item === note));
    const copy = journeyCopy[note.dataset.journeyNote];
    if ($('#journeyDetail') && copy) $('#journeyDetail').innerHTML = `<b>${copy[0]}</b><span>${copy[1]}</span>`;
  });
  const previewCopy = {
    notes: ['Notesbogen samler det hele', 'Opret fag og forelæsninger, og find dem igen i den samme semesterbog.'],
    tools: ['Værktøjer tæt på noten', 'Indsæt kode, formler, modeller og PDF-materiale uden at forlade papiret.'],
    plan: ['En plan, du kan følge', 'Kobl eksamensdatoen sammen med pensum og de noter, du allerede har skrevet.'],
    train: ['Træn på dit eget materiale', 'Lav flashcards og spørgsmål direkte ud fra det, du faktisk skal kunne.'],
  };
  const guideStack = $('#previewGuideStack');
  guideStack?.addEventListener('click', () => {
    const cards = Array.from(guideStack.querySelectorAll('.guide-card'));
    const positions = ['is-top', 'is-next', 'is-third', 'is-back'];
    const current = cards.findIndex(card => card.classList.contains('is-top'));
    const next = (current + 1) % cards.length;
    cards.forEach((card, index) => {
      positions.forEach(position => card.classList.remove(position));
      card.classList.add(positions[(index - next + cards.length) % cards.length]);
    });
    const active = cards[next];
    const copy = previewCopy[active.dataset.guideKey];
    if ($('#previewBoardDetail') && copy) {
      $('#previewBoardDetail').innerHTML = `<b>${next + 1} · ${copy[0]}</b><span>${copy[1]}</span>`;
    }
  });
}

function applyLandingLanguage(language) {
  const copy = {
    da: ['Din intelligente universitetsnotesbog', 'gør det nemmere at tage noter og lære samtidig', 'Vælg dit studieområde, og få værktøjer til STEM, humaniora, økonomi, sprog, samfund, sundhed eller jura.', 'Åbn din notesbog'],
    en: ['Your intelligent university notebook', 'makes note-taking and learning easier at the same time', 'Choose your field and get tools for STEM, humanities, economics, languages, social science, health or law.', 'Open your notebook'],
    sv: ['Din intelligenta universitetsanteckningsbok', 'gör det enklare att anteckna och lära samtidigt', 'Välj studieområde och få relevanta verktyg för dina kurser.', 'Öppna din anteckningsbok'],
    no: ['Din intelligente universitetsnotatbok', 'gjør det enklere å ta notater og lære samtidig', 'Velg studieområde og få relevante verktøy for fagene dine.', 'Åpne notatboken'],
    fr: ['Votre carnet universitaire intelligent', "facilite la prise de notes et l'apprentissage", 'Choisissez votre domaine et obtenez les outils adaptés à vos études.', 'Ouvrir le carnet'],
    es: ['Tu cuaderno universitario inteligente', 'facilita tomar apuntes y aprender al mismo tiempo', 'Elige tu área de estudio y utiliza herramientas adaptadas a tus asignaturas.', 'Abrir el cuaderno'],
  }[language] || null;
  if (!copy) return;
  $('.hero-kicker').textContent = copy[0];
  const heading = $('.hero h1');
  heading.innerHTML = `<span class="hero-wordmark">Note<sup>'it</sup></span> ${copy[1]}`;
  $('.hero-lead').textContent = copy[2];
  $('.hero-btns [data-goto-app]').textContent = copy[3];
  const flag = $('#landingFlag');
  if (flag) flag.className = `flag-mark flag-${language}`;
}

function render() {
  applyUiLanguage();
  document.body.classList.toggle('guest-mode', isGuest());
  if (!isGuest()) $('#guestSaveNotice')?.classList.remove('visible');
  document.querySelectorAll('.nav-item[data-nav="notebook"]').forEach(item => item.classList.add('active'));
  document.querySelectorAll('.nav-item:not([data-nav="notebook"])').forEach(item => item.classList.remove('active'));
  renderGuestBanner();
  checkAppVersionUpdate();
  renderStudyHelpStatus();
  renderSemesters();
  renderSubjects();
  renderProjects();
  renderResources();
  renderExamSidebar();
  renderWorkspace();
  renderWidgets();
  renderProfileStatus();
  syncWidgetsVisibility();
}

function semesterOptions(selectedId) {
  const lang = uiLang();
  return (data.semesters || [])
    .sort((a, b) => semesterSortKey(a) - semesterSortKey(b))
    .map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${escapeHtml(formatSemesterOption(s))}</option>`)
    .join('');
}

function renderSemesters() {
  const el = $('#semesters');
  if (el) el.innerHTML = '';
}

function nextExamInfo() {
  const upcoming = (examData.subjects || [])
    .map(s => ({ ...s, days: Math.ceil((new Date(s.date + 'T12:00:00') - new Date()) / 86400000) }))
    .filter(s => s.days >= 0)
    .sort((a, b) => a.days - b.days)[0];
  return upcoming || null;
}

function examProgressPct() {
  const tasks = (examData.plan || []).flatMap(d => d.tasks);
  if (!tasks.length) return 0;
  return Math.round(tasks.filter(t => examData.checks[t.id]).length / tasks.length * 100);
}

function renderExamSidebar() {
  const el = $('#examSidebarCard');
  if (!el) return;
  const pct = examProgressPct();
  const n = (examData.subjects || []).length;
  const upcoming = (examData.subjects || [])
    .map(subject => ({ ...subject, days: Math.ceil((new Date(`${subject.date}T12:00:00`) - new Date()) / 86400000) }))
    .filter(subject => subject.days >= 0)
    .sort((a, b) => a.days - b.days);
  const urgent = upcoming.some(subject => subject.days <= 10);
  if (urgent && 'Notification' in window && Notification.permission === 'granted') {
    const today = dayKey(new Date());
    const notificationKey = `noteit-exam-notified-${today}`;
    if (!sessionStorage.getItem(notificationKey)) {
      const closest = upcoming[0];
      new Notification(`Eksamen i ${closest.name}`, {
        body: closest.days === 0 ? 'Eksamen er i dag.' : `Der er ${closest.days} dage tilbage. Åbn eksamensplanen og se dagens opgaver.`,
      });
      sessionStorage.setItem(notificationKey, '1');
    }
  }
  el.innerHTML = `
    <div class="exam-card">
      <div class="exam-card-head">
        <strong>📅 Eksamensplan</strong>
        ${n ? `<span class="exam-badge">${n} fag</span>` : ''}
      </div>
      ${upcoming.length
        ? `<div class="exam-upcoming-list ${urgent ? 'urgent' : ''}">${upcoming.map(subject => `<p class="exam-next"><b>${escapeHtml(subject.name)}</b><span>${subject.days === 0 ? 'I dag' : `${subject.days} dage`}</span></p>`).join('')}</div>`
        : '<p class="exam-next muted">Tilføj eksamensfag og få en daglig plan.</p>'}
      ${pct ? `<div class="exam-mini-progress"><div style="width:${pct}%"></div></div><small>${pct}% gennemført</small>` : ''}
      <button type="button" class="exam-card-btn" data-action="open-exam">Åbn eksamensplan</button>
    </div>`;
}

function removeExamSubjectFromPlan(subjectId) {
  const subject = (examData.subjects || []).find(s => s.id === subjectId);
  if (!subject) return;
  if (!confirm(`Slet "${subject.name}" fra eksamensplanen? Planlagte opgaver for faget fjernes også.`)) return;
  examData.subjects = (examData.subjects || []).filter(s => s.id !== subjectId);
  examData.plan = (examData.plan || [])
    .map(day => ({ ...day, tasks: (day.tasks || []).filter(task => task.subject !== subject.name) }))
    .filter(day => day.tasks.length);
  const remainingTaskIds = new Set(examData.plan.flatMap(day => day.tasks.map(task => task.id)));
  Object.keys(examData.checks || {}).forEach(key => {
    if (!remainingTaskIds.has(key)) delete examData.checks[key];
  });
  if (selectedExamPlanSubject === subjectId) closeExamPlanSubject();
  saveExamData();
  renderExamSubjects();
  renderExamSidebar();
  if (!examData.subjects.length || !examData.plan.length) {
    showExamPlanBuilder();
  }
  renderExamPlan();
}

function renderExamPlanDashboard() {
  const host = $('#examPlanDashboard');
  if (!host) return;
  const plan = examData.plan || [];
  const subjects = examData.subjects || [];
  host.hidden = false;
  const tasks = plan.flatMap(day => (day.tasks || []).map(task => ({ ...task, date: day.date })));
  const done = tasks.filter(task => examData.checks[task.id]).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12);
  const monthName = monthStart.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' }).toUpperCase();
  const firstDay = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const examByDay = new Map(subjects.map(subject => [Number(subject.date?.slice(8, 10)), subject]));
  const taskDays = new Set(plan.filter(day => {
    const date = new Date(`${day.date}T12:00:00`);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).map(day => Number(day.date.slice(8, 10))));
  const calCells = Array.from({ length: firstDay }, () => '<button type="button" class="paper-cal-day muted"></button>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const exam = examByDay.get(day);
    calCells.push(`<button type="button" class="paper-cal-day ${day === now.getDate() ? 'today' : ''} ${taskDays.has(day) ? 'has-task' : ''} ${exam ? 'has-exam' : ''}" title="${exam ? `Eksamen: ${escapeHtml(exam.name)}` : ''}">${day}</button>`);
  }
  const upcoming = subjects.map(subject => ({
    ...subject,
    days: Math.ceil((new Date(`${subject.date}T12:00:00`) - now) / 86400000),
  })).filter(subject => subject.days >= 0).sort((a, b) => a.days - b.days);
  const tableRows = tasks.slice(0, 9).map(task => {
    const statusIndex = examData.checks[task.id] ? 0 : /repetition|prøveeksamen|træn/i.test(task.topic || '') ? 1 : 2;
    const statusMarks = ['✓', '◐', '●', '○'];
    const subject = findExamSubjectForTask(task);
    const noteText = subject?.files?.[0]?.name || subject?.topics?.[0] || 'Tilføj materiale';
    return `<tr>
      <td>${new Date(`${task.date}T12:00:00`).toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit' })}</td>
      <td>${escapeHtml(task.subject)}</td>
      <td>${escapeHtml(task.topic)}</td>
      <td><button type="button" class="paper-table-link" data-open-plan-note="${task.id}">${escapeHtml(noteText)}</button></td>
      <td><label class="paper-status-dot"><input type="checkbox" data-exam-check="${task.id}" ${examData.checks[task.id] ? 'checked' : ''}><span>${statusMarks[statusIndex]}</span></label></td>
    </tr>`;
  }).join('');
  const subjectIcons = ['▤', '◎', '▦', '◈', '△', '◇'];
  const subjectRows = subjects.map((subject, index) => {
    const subjectTasks = tasks.filter(task => task.subject === subject.name);
    const subjectDone = subjectTasks.filter(task => examData.checks[task.id]).length;
    const subjectPct = subjectTasks.length ? Math.round(subjectDone / subjectTasks.length * 100) : 0;
    return `<button type="button" class="paper-subject-row${subject.id === selectedExamPlanSubject ? ' active' : ''}" data-open-exam-subject="${subject.id}">
      <span>${subjectIcons[index % subjectIcons.length]}</span>
      <b>${escapeHtml(subject.name)}</b>
      <i><em style="width:${subjectPct}%"></em></i>
      <small>${subjectPct}%</small>
    </button>`;
  }).join('');
  const strongNotes = subjects.slice(0, 3).map(subject => `<li>${escapeHtml(subject.name)} - ${escapeHtml((subject.topics || [])[0] || 'Overblik')}</li>`).join('');
  const weakNotes = subjects.slice(3, 6).map(subject => `<li>${escapeHtml(subject.name)} - tilføj materiale eller noter</li>`).join('') || '<li>Tilføj flere fag for at se svage områder</li>';
  host.innerHTML = `<div class="paper-exam-board">
    <div class="paper-stack-shadow"></div>
    <aside class="paper-left">
      <section class="paper-card paper-calendar-card">
        <h3>KALENDER</h3>
        <div class="paper-cal-head"><span>‹</span><b>${monthName}</b><span>›</span></div>
        <div class="paper-cal-week">${['M','T','O','T','F','L','S'].map(day => `<span>${day}</span>`).join('')}</div>
        <div class="paper-cal-grid">${calCells.join('')}</div>
      </section>
      <section class="paper-card paper-coming-card">
        <h3>KOMMENDE EKSAMENER</h3>
        ${upcoming.length ? upcoming.slice(0, 5).map(subject => `<button type="button" class="${subject.id === selectedExamPlanSubject ? 'active' : ''}" data-open-exam-subject="${subject.id}"><span>${new Date(`${subject.date}T12:00:00`).toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit' })}</span>${escapeHtml(subject.name)}</button>`).join('') : '<p class="hint">Tilføj et fag for at starte.</p>'}
      </section>
      <button type="button" class="paper-note-card tilted" data-open-exam-prep-from-plan><b>Næste skridt</b><br>Start eksamenstræning<br>når fag er tilføjet.</button>
    </aside>
    <main class="paper-center">
      <header class="paper-title">
        <h2>EKSAMENSPLAN</h2>
        <p>overblik · struktur · ro</p>
      </header>
      <section class="paper-goal-card"><b>MÅL:</b><span contenteditable="true" spellcheck="false">Gør mit bedste og forstå stoffet</span><i>♡</i></section>
      <section class="paper-study-table">
        <h3>STUDIEPLAN</h3>
        <table>
          <thead><tr><th>DATO</th><th>FAG</th><th>EMNE / OPGAVE</th><th>NOTER</th><th>STATUS</th></tr></thead>
          <tbody>${tableRows || '<tr><td>--/--</td><td><button type="button" class="paper-table-link" id="addExamSubjectDash">Vælg fag</button></td><td>Tilføj dine egne noter og materialer</td><td><button type="button" class="paper-table-link" id="addExamSubjectDash">Tilføj materiale</button></td><td><span class="paper-status-dot"><span>○</span></span></td></tr>'}</tbody>
        </table>
        <div class="paper-status-legend"><b>STATUSFORKLARING</b><span>✓ Færdig</span><span>◐ Påbegyndt</span><span>● Skal arbejdes med</span><span>○ Ikke startet</span></div>
      </section>
      <div class="paper-note-grid">
        <section class="paper-note-list"><h3>NOTER JEG ER STÆRK I <span>✓</span></h3><ul>${strongNotes || '<li>Tilføj fag fra dine noter</li>'}</ul></section>
        <section class="paper-note-list"><h3>NOTER JEG ER SVAG I <span>!</span></h3><ul>${weakNotes}</ul></section>
      </div>
      <nav class="paper-bottom-tabs">
        <button type="button" class="active" data-exam-plan-show-builder>⌂ OVERBLIK</button>
        <button type="button" data-exam-plan-show-builder>▤ NOTER</button>
        <button type="button" id="addExamSubjectDash">▧ RESSOURCER</button>
        <button type="button" data-exam-plan-show-builder>▦ PLANLÆGNING</button>
      </nav>
    </main>
    <aside class="paper-right">
      <section class="paper-card paper-subjects-card"><h3>MINE FAG</h3>${subjectRows || '<button type="button" class="paper-empty-subject" id="addExamSubjectDash"><span>+</span><b>Tilføj dit første fag</b><small>Vælg fra dine noter og tilføj materiale</small></button>'}</section>
      <button type="button" class="paper-note-card small" id="addExamSubjectDash"><b>Kom i gang</b><br>Tilføj fag, pensum<br>og eksamensdato.</button>
      <div class="paper-actions">
        <button type="button" class="btn-outline" data-exam-plan-show-builder>Rediger fag</button>
        <button type="button" class="btn-primary" id="addExamSubjectDash">+ Tilføj materiale</button>
      </div>
    </aside>
  </div>`;
  document.querySelector('.exam-plan-builder-section')?.classList.toggle('hidden', true);
}

function showExamPlanBuilder() {
  renderExamPlanDashboard();
}

function openExamDialog() {
  closeExamPlanSubject();
  renderExamSubjects();
  renderExamPlan();
  renderExamSubjectCards();
  renderExamPlanDashboard();
  $('#examDialog').showModal();
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(() => renderExamSidebar()).catch(() => {});
  }
}

function trackTab() {}


function startInlineRename(target) {
  const type = target.dataset.renameNotebook ? 'notebook' : target.dataset.renameSubject ? 'subject' : 'page';
  const id = target.dataset.renameNotebook || target.dataset.renameSubject || target.dataset.renamePage;
  const item = type === 'notebook'
    ? data.semesters.find(entry => entry.id === id)
    : type === 'subject'
      ? data.subjects.find(entry => entry.id === id)
      : data.pages.find(entry => entry.id === id);
  if (!item || target.querySelector('input')) return;
  const fallback = type === 'notebook' ? formatSemesterOption(item) : type === 'subject' ? 'Nyt fag' : 'Uden titel';
  const oldValue = (item.name || item.title || fallback).trim();
  const input = document.createElement('input');
  input.className = 'inline-rename-input';
  input.value = oldValue;
  input.setAttribute('aria-label', 'Omdøb');
  const previousHtml = target.innerHTML;
  target.classList.add('renaming');
  target.innerHTML = '';
  target.appendChild(input);
  input.focus();
  input.select();
  const finish = (save) => {
    const next = input.value.trim();
    target.classList.remove('renaming');
    if (save && next && next !== oldValue) {
      if (type === 'page') {
        item.title = next;
        item.updated = new Date().toISOString();
      } else {
        item.name = next;
      }
      persist();
      render();
      return;
    }
    target.innerHTML = previousHtml;
  };
  input.addEventListener('click', event => event.stopPropagation());
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener('blur', () => finish(true), { once: true });
}

function renderSubjects() {
  const el = $('#subjects');
  if (!el) return;
  if (!data.subjects.length) {
    el.innerHTML = '';
    renderRecentlyDeleted();
    return;
  }
  const usedSemesterIds = new Set(data.subjects.map(subject => subject.semesterId));
  const sorted = [...(data.semesters || [])]
    .filter(sem => usedSemesterIds.has(sem.id))
    .sort((a, b) => semesterSortKey(a) - semesterSortKey(b));
  el.innerHTML = sorted.map(sem => {
        const subs = data.subjects.filter(s => s.semesterId === sem.id);
        const semOpen = data.ui.semesterOpen[sem.id] !== false;
        return `<div class="semester-group notebook-tree ${semOpen ? 'open' : 'collapsed'}">
          <button type="button" class="semester-toggle" data-toggle-semester="${sem.id}"><span class="tree-chevron">${semOpen ? '−' : '+'}</span><span class="subject-dot" style="background:${sem.color}"></span><span class="editable-name" data-rename-notebook="${sem.id}" title="Klik for at omdøbe">${escapeHtml(sem.name || formatSemesterOption(sem))}</span></button>
          <div class="semester-subjects">
            ${subs.map(s => `
              <div class="subject-tree ${data.ui.subjectOpen[s.id] ? 'open' : ''}">
                <div class="subject-row ${s.id === data.currentSubject ? 'active' : ''}">
                  <button type="button" class="subject-btn" data-toggle-subject="${s.id}">
                    <span class="tree-chevron">${data.ui.subjectOpen[s.id] ? '−' : '+'}</span>
                    <span class="subject-dot" style="background:${s.color}"></span>
                    <span class="subject-name editable-name" data-rename-subject="${s.id}" title="Klik for at omdøbe">${escapeHtml(s.name)}</span>
                  </button>
                  <button type="button" class="subject-add-topic" data-add-topic="${s.id}" title="Ny forelæsningsnote">+</button>
                  <button type="button" class="subject-delete" data-delete-subject="${s.id}" title="Slet">×</button>
                </div>
                <div class="subject-pages">
                  ${data.pages.filter(p => p.subjectId === s.id).map(p => `<div class="subject-page-row"><button type="button" class="subject-page ${p.id === data.currentPage ? 'active' : ''}" data-page="${p.id}"><span>⌑</span><span class="editable-name page-title-name" data-rename-page="${p.id}" title="Klik for at omdøbe">${escapeHtml(p.title || 'Uden titel')}</span></button><button type="button" class="subject-page-delete" data-delete-page="${p.id}" title="Flyt til Sidst slettet">×</button></div>`).join('')}
                  <button type="button" class="subject-page add-lecture" data-add-topic="${s.id}">+ Forelæsning / lektion</button>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }).join('');
  renderRecentlyDeleted();
}

function movePageToTrash(pageId) {
  const page = data.pages.find(item => item.id === pageId);
  if (!page) return;
  data.trash ||= [];
  data.trash.unshift({ ...page, deletedAt: new Date().toISOString() });
  data.pages = data.pages.filter(item => item.id !== pageId);
  if (data.currentPage === pageId) {
    const rest = data.pages.filter(item => item.subjectId === page.subjectId);
    data.currentPage = rest[0]?.id || null;
  }
}

function renderRecentlyDeleted() {
  const host = $('#recentlyDeleted');
  if (!host) return;
  data.trash ||= [];
  host.innerHTML = `<details class="trash-folder">
    <summary><span>Sidst slettet</span><small>${data.trash.length}</small></summary>
    <p>Slettede noter fjernes automatisk efter 24 timer.</p>
    <div>${data.trash.length ? data.trash.map(item => `<article><span><b>${escapeHtml(item.title || 'Uden titel')}</b><small>${escapeHtml(data.subjects.find(subject => subject.id === item.subjectId)?.name || 'Ukendt fag')}</small></span><button type="button" data-restore-page="${item.id}">Gendan</button><button type="button" data-purge-page="${item.id}" title="Slet permanent">×</button></article>`).join('') : '<small>Papirkurven er tom.</small>'}</div>
  </details>`;
}

function renderProjects() {
  const body = $('#projectsList');
  const toggle = $('#toggleProjects');
  if (!body) return;
  body.classList.toggle('hidden', !data.ui.projectsOpen);
  if (toggle) toggle.setAttribute('aria-expanded', data.ui.projectsOpen ? 'true' : 'false');
  body.innerHTML = data.projects.length
    ? data.projects.map(p => `<button type="button" class="sidebar-link" data-project="${p.id}">${escapeHtml(p.name)}</button>`).join('')
    : '<div class="empty-list" style="padding:8px 0">Ingen projekter endnu.</div>';
}

function renderGroupList() {
  const list = $('#groupList');
  if (!list) return;
  list.innerHTML = data.groups.length
    ? data.groups.map(group => `<button type="button" class="workspace-list-item ${group.id === activeGroupId ? 'active' : ''}" data-open-group="${group.id}"><strong>${escapeHtml(group.name)}</strong><small>${group.members.length} deltagere</small></button>`).join('')
    : '<div class="empty-list">Ingen grupper endnu.</div>';
}

const groupToolTitles = {
  board: ['Opslagstavle', 'Fælles sedler, beskeder og hurtige aftaler'],
  brainstorm: ['Brainstorm', 'Alle kan tilføje idéer og samle dem efter forfatter'],
  notes: ['Fælles noter', 'Skriv og organiser gruppens noter ét sted'],
  quiz: ['Gruppequiz', 'Lav spørgsmål og test hinanden'],
  roles: ['Roller', 'Fordel ansvar og ejerskab'],
  meeting: ['Mødeplan', 'Planlæg møder, dagsorden og beslutninger'],
  tasks: ['Opgavetavle', 'Se hvem der gør hvad og hvornår'],
  overview: ['Gruppeoverblik', 'Samlet status for gruppens arbejde'],
  sources: ['Fælles kilder', 'Saml links, bøger og referencer'],
  decisions: ['Beslutningslog', 'Gem valg, begrundelser og ansvar'],
  feedback: ['Peer feedback', 'Giv konkret og struktureret respons'],
  files: ['Fælles filer', 'Tilføj materialer til gruppens rum'],
};

const projectToolTitles = {
  upload: ['Projektmateriale', 'Saml brief, krav og filer'],
  brainstorm: ['Brainstorm', 'Udforsk retninger og saml idéerne'],
  milestones: ['Milepæle', 'Planlæg leverancer og deadlines'],
  kanban: ['Kanban', 'Flyt opgaver mellem To do, I gang og Færdig'],
  research: ['Research', 'Saml kilder, fund og dokumentation'],
  risks: ['Risici', 'Følg antagelser, problemer og plan B'],
  team: ['Projektgruppe', 'Deltagere, roller og ansvar'],
  report: ['Rapportbygger', 'Byg rapportens afsnit og status'],
};

function setGroupDialogMode(active) {
  const dialog = $('#groupDialog');
  dialog?.classList.toggle('tool-active', active);
}

function setProjectDialogMode(active) {
  const dialog = $('#projectDialog');
  dialog?.classList.toggle('tool-active', active);
}

function workspaceShell(kind, id, tool, title, subtitle, body, actions = '') {
  return `<div class="immersive-workspace ${kind}-workspace-view" data-active-${kind}="${id}" data-active-tool="${tool}">
    <div class="immersive-head">
      <button type="button" class="workspace-back" data-${kind}-back>← Tilbage</button>
      <div><span>${kind === 'group' ? 'Fælles studierum' : 'Projektstudie'}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div>
      ${actions}
    </div>
    <div class="immersive-body">${body}</div>
    <p class="collab-status"><span></span> Ændringer gemmes automatisk</p>
  </div>`;
}

function renderGroupTool(group, tool) {
  const [title, subtitle] = groupToolTitles[tool] || ['Gruppearbejde', 'Fælles arbejdsrum'];
  const author = getSession()?.name || 'Deltager';
  let body = '';
  let actions = '';
  if (tool === 'board') {
    body = `<form class="workspace-inline-form" data-group-form="board">
        <input name="text" required placeholder="Skriv en besked til gruppen">
        <select name="color"><option value="yellow">Gul</option><option value="blue">Blå</option><option value="green">Grøn</option><option value="pink">Rosa</option></select>
        <button class="btn-primary">Sæt op</button>
      </form>
      <div class="notice-board">${group.workspaces.board.length ? group.workspaces.board.map((note, index) => `<article class="board-note color-${note.color || 'yellow'}" style="--turn:${(index % 5) - 2}deg"><button type="button" data-group-delete="board" data-record-id="${note.id}" title="Fjern seddel">×</button><p>${escapeHtml(note.text)}</p><small>${escapeHtml(note.author || author)}</small></article>`).join('') : '<div class="workspace-empty">Opslagstavlen er tom. Sæt den første seddel op.</div>'}</div>`;
  } else if (tool === 'brainstorm') {
    actions = `<button type="button" class="btn-primary" data-collect-group-ideas>Saml ideerne</button>`;
    body = `<form class="workspace-inline-form" data-group-form="brainstorm"><input name="text" required placeholder="Skriv en idé"><input name="author" value="${escapeHtml(author)}" placeholder="Navn"><button class="btn-primary">Tilføj idé</button></form>
      <div class="brain-map">${group.cards.length ? group.cards.map((card, index) => `<article class="idea-node color-${index % 5}"><button type="button" data-group-delete="brainstorm" data-record-id="${card.id || index}">×</button><p>${escapeHtml(card.text || '')}</p><small>${escapeHtml(card.author || author)}</small></article>`).join('') : '<div class="brain-center">Fælles idéer</div>'}</div>
      ${group.summary ? `<div class="collected-ideas">${group.summary}</div>` : ''}`;
  } else if (tool === 'notes') {
    body = `<div class="workspace-paper"><textarea data-group-live="notes" placeholder="Skriv fælles noter her...">${escapeHtml(group.notes || '')}</textarea></div>`;
  } else if (tool === 'quiz') {
    actions = `<button type="button" class="btn-outline" data-ai-group-quiz>✦ AI-generér quiz</button>`;
    body = `<form class="workspace-inline-form" data-group-form="quiz"><input name="question" required placeholder="Spørgsmål"><input name="answer" required placeholder="Svar"><button class="btn-primary">Tilføj</button></form>
      <div class="workspace-list">${group.quiz.length ? group.quiz.map((item, index) => {
        const q = typeof item === 'string' ? item : item.question;
        const a = typeof item === 'string' ? 'Drøft svaret i gruppen' : item.answer;
        return `<article><div><b>${escapeHtml(q)}</b><details><summary>Vis svar</summary><p>${escapeHtml(a)}</p></details></div><button type="button" data-group-delete="quiz" data-record-id="${item.id || index}">×</button></article>`;
      }).join('') : '<div class="workspace-empty">Ingen quizspørgsmål endnu. Tilføj manuelt eller tryk "AI-generér quiz".</div>'}</div>`;
  } else if (tool === 'roles') {
    body = `<form class="workspace-inline-form" data-group-form="roles"><input name="name" required placeholder="Navn"><input name="role" required placeholder="Rolle eller ansvar"><button class="btn-primary">Fordel rolle</button></form>${renderWorkspaceRecords(group.workspaces.roleList, 'group', 'roles', ['name', 'role'])}`;
  } else if (tool === 'meeting') {
    body = `<form class="workspace-form-grid" data-group-form="meeting"><input name="title" required placeholder="Mødets titel"><input name="date" type="date" required><input name="time" type="time"><textarea name="agenda" placeholder="Dagsorden"></textarea><button class="btn-primary">Planlæg møde</button></form>${renderWorkspaceRecords(group.workspaces.meetings, 'group', 'meeting', ['title', 'date', 'time', 'agenda'], true)}`;
  } else if (tool === 'tasks') {
    body = `<form class="workspace-form-grid" data-group-form="tasks"><input name="title" required placeholder="Opgave"><input name="owner" placeholder="Ansvarlig"><input name="due" type="date"><select name="status"><option>To do</option><option>I gang</option><option>Til feedback</option><option>Færdig</option></select><button class="btn-primary">Tilføj opgave</button></form>${renderWorkspaceRecords(group.workspaces.tasks, 'group', 'tasks', ['title', 'owner', 'due', 'status'], true)}`;
  } else if (tool === 'overview') {
    const done = group.workspaces.tasks.filter(item => item.status === 'Færdig').length;
    body = `<div class="overview-metrics"><article><strong>${group.members.length || 1}</strong><span>Deltagere</span></article><article><strong>${group.cards.length}</strong><span>Idéer</span></article><article><strong>${done}/${group.workspaces.tasks.length}</strong><span>Opgaver færdige</span></article><article><strong>${group.decisions.length}</strong><span>Beslutninger</span></article></div>
      <div class="workspace-paper"><h4>Næste skridt</h4><textarea data-group-live="overview" placeholder="Skriv gruppens næste skridt...">${escapeHtml(group.overview || '')}</textarea></div>`;
  } else if (tool === 'sources') {
    body = `<form class="workspace-inline-form" data-group-form="sources"><input name="title" required placeholder="Kildens titel"><input name="url" type="url" placeholder="https://"><button class="btn-primary">Tilføj kilde</button></form>${renderWorkspaceRecords(group.sources, 'group', 'sources', ['title', 'url'])}`;
  } else if (tool === 'decisions') {
    body = `<form class="workspace-form-grid" data-group-form="decisions"><input name="text" required placeholder="Beslutning"><input name="owner" placeholder="Ansvarlig"><textarea name="reason" placeholder="Begrundelse"></textarea><button class="btn-primary">Gem beslutning</button></form>${renderWorkspaceRecords(group.decisions, 'group', 'decisions', ['text', 'owner', 'reason'])}`;
  } else if (tool === 'feedback') {
    body = `<form class="workspace-form-grid" data-group-form="feedback"><input name="to" required placeholder="Feedback til"><textarea name="strength" required placeholder="Det fungerer godt fordi..."></textarea><textarea name="next" required placeholder="Næste forbedring er..."></textarea><button class="btn-primary">Gem feedback</button></form>${renderWorkspaceRecords(group.workspaces.feedbackList, 'group', 'feedback', ['to', 'strength', 'next'])}`;
  } else if (tool === 'files') {
    body = `<label class="workspace-file-drop">Vælg filer fra din computer<input type="file" data-group-workspace-file multiple></label>${renderWorkspaceFiles(group.files, 'group')}`;
  }
  return workspaceShell('group', group.id, tool, title, subtitle, body, actions);
}

function renderWorkspaceRecords(records, kind, tool, fields, withStatus = false) {
  if (!records.length) return '<div class="workspace-empty">Der er ikke tilføjet noget endnu.</div>';
  return `<div class="workspace-list">${records.map((item, index) => `<article class="${withStatus && (item.status === 'Færdig' || item.done) ? 'is-done' : ''}"><div>${fields.map((field, fieldIndex) => item[field] ? `${fieldIndex === 0 ? '<b>' : '<p>'}${escapeHtml(item[field])}${fieldIndex === 0 ? '</b>' : '</p>'}` : '').join('')}</div><button type="button" data-${kind}-delete="${tool}" data-record-id="${item.id || index}" title="Slet">×</button></article>`).join('')}</div>`;
}

function renderWorkspaceFiles(files, kind) {
  if (!files.length) return '<div class="workspace-empty">Ingen filer endnu.</div>';
  return `<div class="workspace-file-list">${files.map((file, index) => {
    const name = typeof file === 'string' ? file : file.name;
    return `<article><span>Dokument</span><b>${escapeHtml(name)}</b><button type="button" data-${kind}-delete="files" data-record-id="${index}">×</button></article>`;
  }).join('')}</div>`;
}

function formRecord(form) {
  return Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value).trim()]));
}

function removeWorkspaceRecord(records, recordId) {
  const byId = records.findIndex(item => String(item?.id) === String(recordId));
  const index = byId >= 0 ? byId : Number(recordId);
  if (Number.isInteger(index) && index >= 0 && index < records.length) records.splice(index, 1);
}

function groupedIdeaSummary(cards) {
  const groups = cards.reduce((result, card) => {
    const text = String(card.text || '').trim();
    if (!text) return result;
    const author = card.author || 'Deltager';
    (result[author] ||= []).push(text);
    return result;
  }, {});
  if (!Object.keys(groups).length) return '<p>Tilføj mindst én idé først.</p>';
  return `<h4>Idéerne samlet efter navn</h4>${Object.entries(groups).map(([author, ideas]) => `<section><b>${escapeHtml(author)}</b>${ideas.map(idea => `<p>${escapeHtml(idea)}</p>`).join('')}</section>`).join('')}`;
}

function renderGroupWorkspace(groupId, tool = null) {
  const host = $('#groupWorkspace');
  const group = data.groups.find(item => item.id === groupId);
  if (!host || !group) return;
  activeGroupId = groupId;
  activeGroupTool = tool;
  renderGroupList();
  setGroupDialogMode(Boolean(tool));
  if (tool) {
    host.innerHTML = renderGroupTool(group, tool);
    return;
  }
  host.innerHTML = `
    <div class="workspace-heading"><div><h3>${escapeHtml(group.name)}</h3><p>Fælles arbejdsrum med ${group.members.length || 1} deltagere</p></div><button class="btn-outline" data-copy-group="${group.id}">Kopiér invitationskode</button></div>
    <div class="group-orbit">
      <div class="brain-core"><span>◉</span><b>Gruppen</b></div>
      ${(group.members.length ? group.members : [getSession()?.name || 'Dig']).map((member, index) => `<div class="member-bubble" style="--i:${index};--total:${Math.max(1, group.members.length)}"><span>${escapeHtml(member.charAt(0).toUpperCase())}</span><small>${escapeHtml(member)}</small></div>`).join('')}
    </div>
    <div class="project-tools">
      <button class="btn-outline" data-group-add-member="${group.id}">+ Tilføj deltager</button>
      <button class="btn-outline" data-open-group-tool="board">Opslagstavle</button>
      <button class="btn-outline" data-open-group-tool="brainstorm">Brainstorm</button>
      <button class="btn-primary" data-open-group-tool="tasks">Opgavetavle</button>
    </div>
    <div class="workspace-launch-grid">${Object.entries(groupToolTitles).map(([key, item]) => `<button type="button" data-open-group-tool="${key}"><span>${key === 'brainstorm' ? '⌁' : key === 'meeting' ? '17' : key === 'board' ? '▤' : key === 'tasks' ? '✓' : '•'}</span><b>${item[0]}</b><small>${item[1]}</small></button>`).join('')}</div>
    <p class="collab-status"><span></span> Gemmes løbende i dette samarbejdsrum</p>`;
}

function renderProjectTool(project, tool) {
  const [title, subtitle] = projectToolTitles[tool] || ['Projektarbejde', 'Projektets arbejdsrum'];
  const author = getSession()?.name || 'Deltager';
  let body = '';
  let actions = '';
  if (tool === 'upload') {
    body = `<label class="workspace-file-drop">Vælg projektfiler fra din computer<input type="file" data-project-workspace-file multiple></label>${renderWorkspaceFiles(project.files, 'project')}`;
  } else if (tool === 'brainstorm') {
    actions = `<button type="button" class="btn-primary" data-collect-project-ideas>Saml ideerne</button>`;
    body = `<form class="workspace-inline-form" data-project-form="brainstorm"><input name="text" required placeholder="Skriv en idé"><input name="author" value="${escapeHtml(author)}" placeholder="Navn"><button class="btn-primary">Tilføj idé</button></form>
      <div class="brain-map">${project.cards.length ? project.cards.map((card, index) => `<article class="idea-node color-${index % 5}"><button type="button" data-project-delete="brainstorm" data-record-id="${card.id || index}">×</button><p>${escapeHtml(card.text || '')}</p><small>${escapeHtml(card.author || author)}</small></article>`).join('') : '<div class="brain-center">Projektidéer</div>'}</div>${project.summary ? `<div class="collected-ideas">${project.summary}</div>` : ''}`;
  } else if (tool === 'milestones') {
    body = `<form class="workspace-form-grid" data-project-form="milestones"><input name="title" required placeholder="Milepæl"><input name="due" type="date"><select name="status"><option>Planlagt</option><option>I gang</option><option>Færdig</option></select><button class="btn-primary">Tilføj milepæl</button></form>${renderWorkspaceRecords(project.workspaces.milestones, 'project', 'milestones', ['title', 'due', 'status'], true)}`;
  } else if (tool === 'kanban') {
    const columns = ['To do', 'I gang', 'Til feedback', 'Færdig'];
    body = `<form class="workspace-inline-form" data-project-form="kanban"><input name="title" required placeholder="Ny opgave"><input name="owner" placeholder="Ansvarlig"><button class="btn-primary">Tilføj</button></form><div class="kanban-board">${columns.map(column => `<section><h4>${column}</h4>${project.workspaces.kanban.filter(item => (item.status || 'To do') === column).map(item => `<article><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.owner || 'Ikke fordelt')}</small><select data-project-kanban-status="${item.id}">${columns.map(option => `<option ${option === column ? 'selected' : ''}>${option}</option>`).join('')}</select><button type="button" data-project-delete="kanban" data-record-id="${item.id}">×</button></article>`).join('')}</section>`).join('')}</div>`;
  } else if (tool === 'research') {
    body = `<form class="workspace-form-grid" data-project-form="research"><input name="title" required placeholder="Kilde eller fund"><input name="url" type="url" placeholder="https://"><textarea name="note" placeholder="Hvorfor er den relevant?"></textarea><button class="btn-primary">Gem research</button></form>${renderWorkspaceRecords(project.workspaces.research, 'project', 'research', ['title', 'url', 'note'])}`;
  } else if (tool === 'risks') {
    body = `<form class="workspace-form-grid" data-project-form="risks"><input name="title" required placeholder="Risiko eller antagelse"><select name="level"><option>Lav</option><option>Mellem</option><option>Høj</option></select><textarea name="plan" placeholder="Forebyggelse eller plan B"></textarea><button class="btn-primary">Tilføj risiko</button></form>${renderWorkspaceRecords(project.workspaces.risks, 'project', 'risks', ['title', 'level', 'plan'])}`;
  } else if (tool === 'team') {
    body = `<form class="workspace-inline-form" data-project-form="team"><input name="name" required placeholder="Navn"><input name="role" placeholder="Rolle"><button class="btn-primary">Tilføj person</button></form>${renderWorkspaceRecords(project.workspaces.team, 'project', 'team', ['name', 'role'])}`;
  } else if (tool === 'report') {
    body = `<form class="workspace-form-grid" data-project-form="report"><input name="title" required placeholder="Afsnit, fx Metode"><textarea name="notes" placeholder="Formål, indhold og kilder"></textarea><select name="status"><option>Ikke startet</option><option>Kladde</option><option>Til feedback</option><option>Færdig</option></select><button class="btn-primary">Tilføj afsnit</button></form>${renderWorkspaceRecords(project.workspaces.report, 'project', 'report', ['title', 'notes', 'status'], true)}`;
  }
  return workspaceShell('project', project.id, tool, title, subtitle, body, actions);
}

function renderProjectWorkspace(projectId, tool = null) {
  const host = $('#projectWorkspace');
  const project = data.projects.find(item => item.id === projectId);
  if (!host || !project) return;
  activeProjectId = projectId;
  activeProjectTool = tool;
  setProjectDialogMode(Boolean(tool));
  if (tool) {
    host.innerHTML = renderProjectTool(project, tool);
    return;
  }
  host.innerHTML = `
    <div class="workspace-heading"><div><h3>${escapeHtml(project.name)}</h3><p>${project.mode === 'brainstorm' ? 'Interaktiv brainstorm' : 'Projektmappe'} · ${project.members.length ? escapeHtml(project.members.join(', ')) : 'arbejder alene'}</p></div></div>
    <div class="project-tools">
      <button class="btn-outline" data-add-project-person="${project.id}">+ Tilføj person</button>
      <label class="btn-outline upload-project">Upload projekt<input type="file" data-project-file="${project.id}"></label>
      <button class="btn-outline" data-open-project-tool="upload">Projektfiler</button>
      <button class="btn-outline" data-open-project-tool="brainstorm">Brainstorm</button>
      <button class="btn-primary" data-open-project-tool="kanban">Kanban</button>
    </div>
    <div class="workspace-launch-grid">${Object.entries(projectToolTitles).map(([key, item]) => `<button type="button" data-open-project-tool="${key}"><span>${key === 'brainstorm' ? '⌁' : key === 'milestones' ? '1·2·3' : key === 'kanban' ? '▥' : key === 'risks' ? '!' : '•'}</span><b>${item[0]}</b><small>${item[1]}</small></button>`).join('')}</div>
    <div class="workspace-paper project-log"><h4>Projektlog</h4><textarea data-project-live="notes" placeholder="Skriv løbende beslutninger og observationer...">${escapeHtml(project.notes || '')}</textarea></div>`;
}

function openNewProjectDialog() {
  activeProjectTool = null;
  setProjectDialogMode(false);
  $('#projectWorkspace').innerHTML = `
    <form id="newProjectForm">
      <h3>Nyt projekt</h3>
      <div class="field"><label>Projektnavn</label><input id="newProjectName" required placeholder="Fx Thesis, speciale eller semesterprojekt"></div>
      <div class="field"><label>Arbejdsform</label><select id="newProjectMode"><option value="folder">Upload og projektmappe</option><option value="brainstorm">Start med brainstorm</option></select></div>
      <div class="field"><label>Læg projektmateriale ind (valgfrit)</label><input id="newProjectInitialFile" type="file"></div>
      <button class="brainstorm-start-card" type="button" data-new-project-brainstorm><span>⌁</span><b>Ikke klar til upload?</b><small>Start en visuel brainstorm først</small></button>
      <p class="hint">Efter oprettelse kan du samle krav, kilder, risici, milepæle, beslutninger og fælles noter.</p>
      <button class="btn-primary" type="submit">Opret projekt</button>
    </form>`;
  $('#projectDialog').showModal();
}

function showHubMessage(hostSelector, title, text, items = []) {
  const host = $(hostSelector);
  if (!host) return;
  host.innerHTML = `<div class="hub-result-card"><div class="hub-result-icon">✦</div><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${items.length ? `<div class="hub-result-items">${items.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}</div></div>`;
}

function renderResources() {
  const body = $('#resourcesList');
  const toggle = $('#toggleResources');
  if (!body) return;
  body.classList.toggle('hidden', !data.ui.resourcesOpen);
  if (toggle) toggle.setAttribute('aria-expanded', data.ui.resourcesOpen ? 'true' : 'false');
  body.innerHTML = (data.resources || []).map(r =>
    `<button type="button" class="sidebar-link" data-resource="${r.id}">${escapeHtml(r.name)}</button>`
  ).join('');
}

function renderCapabilities() {
  const host = $('#capabilityGroups');
  if (!host) return;
  host.innerHTML = capabilityGroups.map((group, index) => `
    <div class="capability-group ${index === 0 && data.ui.capabilitiesFirstOpen ? 'open' : ''}" data-capability-group="${group.id}">
      <button type="button" class="capability-summary" data-toggle-capability="${group.id}">
        <span class="cap-icon">${group.icon}</span><span class="cap-title">${escapeHtml(group.title)}</span>
        <span class="cap-toggle">${index === 0 && data.ui.capabilitiesFirstOpen ? 'minus ' : '+'}</span>
      </button>
      <div class="capability-items">
        ${group.items.map(([label, action]) => `<button type="button" class="capability-item" data-capability-action="${action}" title="${escapeHtml(label)}">${escapeHtml(label)}</button>`).join('')}
      </div>
    </div>`).join('');
}

function extractFormulas(html = '') {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const found = [];
  tmp.querySelectorAll('.equation, .math-line, .stem-block h4, .math-render').forEach(el => {
    const t = el.textContent.trim();
    if (t && !found.includes(t)) found.push(t);
  });
  if (!found.length && html.includes('=')) {
    const m = tmp.innerText.match(/[^\n=]{2,40}=[^\n]{2,40}/);
    if (m) found.push(m[0].trim());
  }
  return found.slice(0, 6);
}

function renderGraphSvg(page, preset) {
  const centerLabel = (page?.title || 'Note').slice(0, 18);
  const nodes = (preset?.graphNodes || ['Emne 1', 'Emne 2', 'Emne 3']).slice(0, 7);
  const cx = 110, cy = 78, r = 52;
  let svg = '';
  nodes.forEach((label, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    svg += `<line class="graph-edge" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`;
    svg += `<ellipse class="graph-node" cx="${x}" cy="${y}" rx="34" ry="14"/>`;
    svg += `<text class="graph-label" x="${x}" y="${y + 3}" text-anchor="middle">${escapeHtml(label.slice(0, 14))}</text>`;
  });
  svg += `<circle class="graph-node center" cx="${cx}" cy="${cy}" r="22"/>`;
  svg += `<text class="graph-label center" x="${cx}" y="${cy + 3}" text-anchor="middle">${escapeHtml(centerLabel)}</text>`;
  return svg;
}

function renderEditorTabs() {
  const subj = activeSubject();
  if (!subj) return '';
  const pages = data.pages
    .filter(p => p.subjectId === subj.id)
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  if (!pages.length) return '';
  return `<div class="editor-tabs-bar">
    ${pages.map((p, index) => `
      <button type="button" class="editor-tab ${p.id === data.currentPage ? 'active' : ''}" data-editor-tab="${p.id}" style="--tab-color:${colors[index % colors.length]}">
        <span>${escapeHtml((p.title || 'Uden titel').slice(0, 22))}</span>
        ${pages.length > 1 ? `<span class="tab-close" data-close-tab="${p.id}">×</span>` : ''}
      </button>`).join('')}
    <button type="button" class="editor-tab-add" id="addPageTab" title="Nyt dokument">+</button>
  </div>`;
}

function toolDrawerIcon(tool) {
  if (CODE_EDITOR_TOOL_ALIASES.has(tool)) return '</>';
  if (['formula', 'latex', 'algebra', 'calculus', 'linearAlgebra', 'matrix', 'statistics'].includes(tool)) return '∑';
  if (['table', 'checklist', 'timeline', 'labReport'].includes(tool)) return '▦';
  if (['model', 'robotFlow', 'brainMap', 'algorithmFig', 'dataStructFig', 'networkFig'].includes(tool)) return '⌘';
  if (['draw', 'circuit', 'graph'].includes(tool)) return '▧';
  if (['bibliography', 'quote', 'citationMap', 'researchQuestion'].includes(tool)) return '⌑';
  return '+';
}

function allToolboxItems(page) {
  const seen = new Set();
  const items = [];
  Object.values(toolPacks).forEach(pack => {
    const sources = [
      ...(pack.tools || []),
      ...(pack.groups || []).flatMap(group => group.tools || []),
    ];
    sources.forEach(([id, label]) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      items.push({ id, label });
    });
  });
  return items.sort((a, b) => a.label.localeCompare(b.label, 'da')).map(item => `
    <button type="button" class="tool-drawer-item interactive-tool" draggable="true" data-tool-drag="${escapeHtml(item.id)}" data-widget-tool="${escapeHtml(item.id)}">
      <span>${escapeHtml(toolDrawerIcon(item.id))}</span><b>${escapeHtml(item.label)}</b>
    </button>`).join('');
}

function renderWidgets() {
  const panel = $('#widgetsPanel');
  if (!panel) return;
  const page = activePage();
  const subj = activeSubject();
  if (data.ui.view === 'notebook') {
    panel.innerHTML = `
      <div class="widget-card markdown-preview-card">
        <div class="widget-card-head"><h4><span class="widget-card-icon">▣</span> Forelæsning 2 – Algoritmer.md</h4><small>Preview</small></div>
        <div class="markdown-preview">
          <span class="crumb">k › Forelæsning 2 – Algoritmer.md</span>
          <ol>
            <li><b># Algoritmer</b></li>
            <li></li>
            <li><b>## Hvad er en algoritme?</b></li>
            <li>En algoritme er en endelig sekvens af præcise instruktioner, der løser et problem.</li>
            <li></li>
            <li><b>## Egenskaber</b></li>
            <li>- Input</li>
            <li>- Output</li>
            <li>- Endelighed</li>
            <li>- Entydighed</li>
            <li></li>
            <li><b>## Eksempel</b></li>
            <li><code>print("Hello, world!")</code></li>
          </ol>
        </div>
      </div>
      <div class="widget-card run-preview-card">
        <div class="widget-card-head"><h4>Kør & Preview</h4></div>
        <button type="button" class="toolbox-insert interactive-tool"><span>▣</span><div><b>Live preview</b><small>http://localhost:5173</small></div><strong>↗</strong></button>
        <button type="button" class="toolbox-insert interactive-tool" data-code-template="Python"><span>&lt;/&gt;</span><div><b>Kør note skabelon</b><small>Indsæt Hello World i noterne</small></div><strong>Indsæt</strong></button>
      </div>`;
    return;
  }
  if (!page || !subj) {
    panel.innerHTML = '<div class="widgets-empty">Åbn et dokument, så tilpasses sidepanelet dit fag.</div>';
    return;
  }
  const preset = widgetPresets[page.docType] || widgetPresets.general;
  const cfg = docTypes[page.docType] || docTypes.general;
  const formulas = extractFormulas(page.html);
  const plainText = page.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const aiActions = (preset.aiActions?.length ? preset.aiActions : DEFAULT_WIDGET_AI).slice(0, 6);
  const codeLang = preset.codeLang || (page.docType === 'tech' || page.docType === 'engineering' ? 'Arduino' : 'Python');
  const codeSnippet = codeSnippets[codeLang] || codeSnippets.Python;
  panel.innerHTML = `
    <div class="widget-card quick-actions-card">
      <div class="quick-action-grid">
        <button type="button" class="interactive-tool" data-widget-ai="explain"><span>∑</span><b>Forklar denne ligning</b></button>
        <button type="button" class="interactive-tool" data-widget-ai="debug"><span>&lt;/&gt;</span><b>Optimer denne kode</b></button>
        <button type="button" class="interactive-tool" data-widget-ai="questions"><span>?</span><b>Lav en quiz</b></button>
        <button type="button" class="interactive-tool" data-widget-ai="explain"><span>=</span><b>Find relevante formler</b></button>
        <button type="button" class="interactive-tool" data-widget-tool="flash"><span>▢</span><b>Husk det</b><small>Lav et flashcard</small></button>
        <button type="button" class="interactive-tool" data-widget-tool="pdf"><span>PDF</span><b>Kildehjælp</b><small>Læs PDF eller tekst</small></button>
      </div>
    </div>
    <div class="widget-card ai-help-card">
      <div class="widget-card-head"><h4><span class="widget-card-icon">✦</span> AI Study Assistant <em>Beta</em></h4><small>${escapeHtml(pageDocTypeLabel(page))}</small></div>
      <p class="widget-ai-prompt">${escapeHtml(preset.aiPrompt)}</p>
      <div class="assistant-suggestions">
        <button type="button" data-widget-ai="explain">Forklar lineær søgning</button>
        <button type="button" data-widget-ai="summarize">Hvad er tidskompleksitet?</button>
        <button type="button" data-widget-ai="questions">Lav et eksempel på binær søgning</button>
      </div>
      <label class="assistant-input"><input type="text" placeholder="Skriv dit spørgsmål..."><button type="button" data-widget-ai="explain">➤</button></label>
    </div>
    <div class="widget-card insert-toolbox-card">
      <div class="widget-card-head"><h4>Indsæt fra værktøjskasse</h4><button type="button" class="widget-card-btn" data-side-action="layout" title="Layout">⌁</button></div>
      <div class="toolbox-insert-list">
        <button type="button" class="toolbox-insert primary interactive-tool" data-code-template="${escapeHtml(codeLang)}">
          <span>&lt;/&gt;</span>
          <div><b>${escapeHtml(codeLang)} kode</b><small>Indsæt et kort Hello World-eksempel</small><pre>${escapeHtml(codeSnippet)}</pre></div>
          <strong>Indsæt</strong>
        </button>
        <button type="button" class="toolbox-insert interactive-tool" data-widget-tool="formula"><span>∑</span><div><b>Formel</b><small>Indsæt matematisk formel</small></div><strong>Indsæt</strong></button>
        <button type="button" class="toolbox-insert interactive-tool" data-widget-tool="table"><span>▦</span><div><b>Tabel</b><small>Indsæt tabel i noten</small></div><strong>Indsæt</strong></button>
        <button type="button" class="toolbox-insert interactive-tool" data-widget-tool="draw"><span>▧</span><div><b>Diagram</b><small>Indsæt diagram eller figur</small></div><strong>Indsæt</strong></button>
      </div>
      <details class="all-tool-drawer" open>
        <summary>Alle værktøjer</summary>
        <div class="all-tool-grid">${allToolboxItems(page)}</div>
      </details>
    </div>
    <div class="widget-card side-study-tools">
      <div class="widget-card-head"><h4>Noteværktøjer</h4></div>
      <div class="side-tool-buttons compact">
        <button type="button" class="interactive-tool" data-side-action="annotate"><span>✎</span><b>${page.viewMode === 'annotate' ? 'Skrivetilstand' : 'PDF og markering'}</b><small>${page.viewMode === 'annotate' ? 'Tilbage til noter' : 'Tegn og kommentér'}</small></button>
        <button type="button" class="interactive-tool" data-widget-tool="calculator"><span>fx</span><b>Lommeregner</b><small>Udtryk og potenser</small></button>
        <button type="button" class="interactive-tool" data-side-action="dictation"><span>Mic</span><b>Stemme</b><small>Tal ind i papiret</small></button>
        <button type="button" class="sticker-pile-tool compact-side-tool interactive-tool" data-side-action="stickers"><span><i></i><i></i><i></i></span><b>Stickers</b><small>Farvede noter</small></button>
      </div>
    </div>
    <div class="widget-card note-compass-card">
      <div class="widget-card-head"><h4><span class="widget-card-icon">◌</span> Denne note</h4></div>
      <div class="note-compass">
        <div><b>${wordCount}</b><span>ord</span></div>
        <div><b>${page.comments?.length || 0}</b><span>svar</span></div>
        <div><b>${formulas.length}</b><span>formler</span></div>
      </div>
      <p>${escapeHtml(pageDocTypeLabel(page))} · ${escapeHtml(page.title || 'Uden titel')}</p>
    </div>
    <div class="widget-card continue-card">
      <div class="widget-card-head"><h4><span class="widget-card-icon">↗</span> Arbejd videre</h4></div>
      <button type="button" class="interactive-tool" data-widget-tool="pdf"><span>PDF</span><div><b>Læs materiale</b><small>Lav noter fra PDF eller tekst</small></div></button>
      <button type="button" class="interactive-tool" data-widget-tool="flash"><span>▢</span><div><b>Lav flashcard</b><small>Gem det vigtigste som kort</small></div></button>
      <button type="button" class="interactive-tool" data-widget-ai="questions"><span>ABC</span><div><b>Eksamensspørgsmål</b><small>Øv dig på denne note</small></div></button>
      <button type="button" class="interactive-tool" data-widget-tool="checklist"><span>✓</span><div><b>Næste skridt</b><small>Indsæt en enkel tjekliste</small></div></button>
    </div>`;
}

function insertCodeTemplate(language = 'Python') {
  if (!$('#editor')) return alert('Åbn en note, før kodeeksemplet indsættes.');
  const lang = codeSnippets[language] ? language : 'Python';
  const code = codeSnippets[lang] || 'print("Hello, world!")';
  const codeHtml = `<div class="code-block" data-language="${escapeHtml(lang)}" contenteditable="false"><pre><code contenteditable="true">${escapeHtml(code)}</code></pre></div><p><br></p>`;
  insertHtml(codeHtml);
}

const terminalSeed = `<b>Note'it study workspace på main</b>
➜ noteit-workspace git:(main) ✕ nit preview
Server kører på http://localhost:5173
✓ Bygget færdig på 328ms`;
let ideTerminalLastCode = 'console.log("Hello, world!")';

function appendIdeTerminal(text) {
  const out = $('#ideTerminalOutput');
  if (!out) return;
  out.innerHTML += `\n${escapeHtml(text)}`;
  out.scrollTop = out.scrollHeight;
}

async function runIdeTerminalCommand(raw) {
  const input = String(raw || '').trim();
  if (!input) return;
  ideTerminalLastCode = input;
  appendIdeTerminal(`➜ ${input}`);
  if (input === 'clear' || input === 'ryd') {
    $('#ideTerminalOutput').innerHTML = terminalSeed;
    return;
  }
  if (input === 'help' || input === 'hjælp') {
    appendIdeTerminal('Kommandoer: help, clear, insert. Skriv JavaScript eller print("Hello, world!") og tryk Kør.');
    return;
  }
  if (input === 'insert' || input === 'indsæt') {
    insertTerminalCodeInNote();
    appendIdeTerminal('Indsat i noten.');
    return;
  }
  const pythonPrint = input.match(/^print\((['"])([\s\S]*)\1\)$/);
  if (pythonPrint) {
    appendIdeTerminal(pythonPrint[2]);
    return;
  }
  const logs = [];
  const fakeConsole = {
    log: (...args) => logs.push(args.map(String).join(' ')),
    warn: (...args) => logs.push(args.map(String).join(' ')),
    error: (...args) => logs.push(args.map(String).join(' ')),
  };
  try {
    const runner = new Function('console', `"use strict"; return (async () => { ${input}\n })();`);
    const result = await runner(fakeConsole);
    if (result !== undefined) logs.push(String(result));
    appendIdeTerminal(logs.length ? logs.join('\n') : 'Kørt uden output.');
  } catch (error) {
    appendIdeTerminal(`Fejl: ${error.message}`);
  }
}

function insertTerminalCodeInNote() {
  if (!$('#editor')) return alert('Åbn en note først.');
  const code = ideTerminalLastCode || $('#ideTerminalInput')?.value || 'console.log("Hello, world!")';
  insertHtml(`<div class="code-block" data-language="JavaScript" contenteditable="false"><pre><code contenteditable="true">${escapeHtml(code)}</code></pre></div><p><br></p>`);
}

function insertDraggedTool(toolId, label = '') {
  if (!$('#editor')) return;
  if (toolId === 'code' || CODE_EDITOR_TOOL_ALIASES.has(toolId)) {
    insertCodeTemplate('Python');
    return;
  }
  const title = label || findToolLabel(toolId, activePage(), appSettings.defaultLanguage || 'da');
  const html = `<section class="tool-drop-block" contenteditable="false" data-tool-card="${escapeHtml(toolId)}"><strong>${escapeHtml(title)}</strong><p contenteditable="true">Skriv noter her...</p></section><p><br></p>`;
  insertHtml(html);
}

function initIdeTerminal() {
  const form = $('#ideTerminalForm');
  const input = $('#ideTerminalInput');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    await runIdeTerminalCommand(input.value);
    input.value = '';
    input.focus();
  });
  input.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') form.requestSubmit();
  });
  $('.ide-terminal')?.addEventListener('click', event => {
    const tab = event.target.closest('[data-terminal-tab]');
    if (tab) {
      document.querySelectorAll('[data-terminal-tab]').forEach(btn => btn.classList.toggle('active', btn === tab));
      const output = $('#ideTerminalOutput');
      if (tab.dataset.terminalTab === 'problems') output.innerHTML = 'Ingen problemer.';
      else if (tab.dataset.terminalTab === 'debug') output.innerHTML = 'Debug console klar.';
      else if (tab.dataset.terminalTab === 'output') output.innerHTML = 'Output vises her, når du kører kode.';
      else output.innerHTML = terminalSeed;
      input.focus();
    }
    if (event.target.closest('#terminalNewSnippet')) {
      input.value = 'console.log("Hello, world!")';
      input.focus();
    }
    if (event.target.closest('#terminalInsertCode')) insertTerminalCodeInNote();
    if (event.target.closest('#terminalClear')) $('#ideTerminalOutput').innerHTML = terminalSeed;
  });
  document.addEventListener('dragstart', event => {
    const tool = event.target.closest('[data-tool-drag], [data-code-template]');
    if (!tool || !event.dataTransfer) return;
    const toolId = tool.dataset.toolDrag || (tool.dataset.codeTemplate ? 'code' : '');
    event.dataTransfer.setData('text/noteit-tool', JSON.stringify({ toolId, label: tool.textContent.trim() }));
    event.dataTransfer.effectAllowed = 'copy';
  });
  document.addEventListener('dragover', event => {
    if (!event.target.closest('#editor, .sheet-editor')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('drop', event => {
    const editor = event.target.closest('#editor, .sheet-editor');
    if (!editor || !event.dataTransfer) return;
    const payload = event.dataTransfer.getData('text/noteit-tool');
    if (!payload) return;
    event.preventDefault();
    try {
      const { toolId, label } = JSON.parse(payload);
      editor.focus();
      insertDraggedTool(toolId, label);
    } catch {}
  });
}

function syncWidgetsVisibility() {
  const area = document.querySelector('.main-area');
  if (!area) return;
  area.classList.toggle('widgets-hidden', data.ui.widgetsOpen === false);
  area.classList.toggle('widgets-visible', data.ui.widgetsOpen !== false);
  const toggle = $('#toggleWidgets');
  if (toggle) {
    const visible = data.ui.widgetsOpen !== false;
    toggle.classList.toggle('panel-open', visible);
    toggle.setAttribute('aria-expanded', String(visible));
    toggle.title = visible ? 'Skjul hjælpepanelet' : 'Vis hjælpepanelet';
  }
}

function syncDarkMode(enabled = document.body.classList.contains('dark-mode')) {
  document.body.classList.toggle('dark-mode', enabled);
  const toggle = $('#toggleDarkMode');
  if (toggle) {
    toggle.classList.toggle('active', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Slå dark mode fra' : 'Slå dark mode til');
    toggle.title = enabled ? 'Slå dark mode fra' : 'Slå dark mode til';
  }
  syncThemeColorMeta();
}

const APP_COLOR_THEMES = {
  classic: { label: 'Klassisk', hint: 'Det varme hovedlook' },
  ocean: { label: 'Ocean', hint: 'Frisk teal med glans' },
  rose: { label: 'Roseguld', hint: 'Varm rosa og guld' },
  forest: { label: 'Skov', hint: 'Frisk grøn energi' },
  lavender: { label: 'Lavendel', hint: 'Blød lilla shimmer' },
  pearl: { label: 'Gråhvid', hint: 'Rolig perlegrå glans' },
  sapphire: { label: 'Safir', hint: 'Dyb blå elegance' },
  black: { label: 'Sort', hint: 'Satin-sort med sølvglans' },
};

function syncThemeColorMeta() {
  const dark = document.body.classList.contains('dark-mode');
  const theme = document.documentElement.dataset.appTheme || 'classic';
  const light = {
    classic: '#f5f1ea', ocean: '#e4f2f7', rose: '#f8efe8', forest: '#e8f0e4',
    lavender: '#f0ebf8', pearl: '#f2f2f0', sapphire: '#e6edf8', black: '#0a0a0a',
  };
  const darkColors = {
    classic: '#211d1a', ocean: '#152830', rose: '#241a18', forest: '#161f18',
    lavender: '#1e1828', pearl: '#1c1c1c', sapphire: '#141c28', black: '#000000',
  };
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? (darkColors[theme] || darkColors.classic) : (light[theme] || light.classic));
}

function syncColorTheme(themeId = localStorage.getItem('noted-theme') || 'classic') {
  if (themeId === 'sunset') themeId = 'pearl';
  const theme = APP_COLOR_THEMES[themeId] ? themeId : 'classic';
  document.documentElement.dataset.appTheme = theme;
  localStorage.setItem('noted-theme', theme);
  if (appSettings) appSettings.colorTheme = theme;
  document.querySelectorAll('[data-app-color-theme]').forEach(btn => {
    const active = btn.dataset.appColorTheme === theme;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  const pickerBtn = $('#toggleThemePicker');
  if (pickerBtn) {
    pickerBtn.dataset.currentTheme = theme;
    pickerBtn.title = `Farvetema: ${APP_COLOR_THEMES[theme].label}`;
  }
  syncThemeColorMeta();
}

function closeThemePicker() {
  const popover = $('#themePickerPopover');
  const btn = $('#toggleThemePicker');
  if (!popover) return;
  popover.hidden = true;
  btn?.setAttribute('aria-expanded', 'false');
}

function toggleThemePicker() {
  const popover = $('#themePickerPopover');
  const btn = $('#toggleThemePicker');
  if (!popover || !btn) return;
  const open = popover.hidden;
  popover.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if (open) popover.querySelector('[data-app-color-theme].active, [data-app-color-theme]')?.focus?.();
}

function initColorThemePicker() {
  const popover = $('#themePickerPopover');
  if (!popover || popover.dataset.ready) return;
  popover.dataset.ready = '1';
  popover.innerHTML = `<div class="theme-picker-head"><b>Farvetema</b><small>Vælg stemning · klassisk er standard</small></div>
    <div class="theme-picker-grid" role="listbox" aria-label="Farvetemaer">
      ${Object.entries(APP_COLOR_THEMES).map(([id, meta]) => `
        <button type="button" class="theme-swatch-btn" data-app-color-theme="${id}" role="option" title="${escapeHtml(meta.label)} · ${escapeHtml(meta.hint)}" aria-label="${escapeHtml(meta.label)}">
          <span class="theme-swatch" aria-hidden="true"></span>
          <span class="theme-swatch-label">${escapeHtml(meta.label)}</span>
        </button>`).join('')}
    </div>`;
  popover.addEventListener('click', event => {
    const swatch = event.target.closest('[data-app-color-theme]');
    if (!swatch) return;
    syncColorTheme(swatch.dataset.appColorTheme);
    closeThemePicker();
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.theme-picker-wrap')) return;
    closeThemePicker();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeThemePicker();
  });
  syncColorTheme(document.documentElement.dataset.appTheme || 'classic');
}

function toggleDarkMode() {
  const enabled = !document.body.classList.contains('dark-mode');
  syncDarkMode(enabled);
  localStorage.setItem('noted-dark', enabled ? '1' : '0');
}

function docTypeBadge(docType) {
  const cfg = docTypes[docType] || docTypes.general;
  const glyph = docTypeGlyphSvg(docType, 'doc-type-badge-glyph');
  return `<span class="page-type-badge" title="${escapeHtml(docTypeDisplayLabel(docType))}">${glyph}</span>`;
}

function handleWidgetTool(tool) {
  const map = {
    graph: () => runStemTool('graph'),
    matrix: () => runStemTool('matrix'),
    convert: () => runStemTool('convert'),
    code: () => openCodeDialog(activePage()?.docType === 'tech' ? 'Arduino' : 'Python'),
    pdf: () => openPdfDialog(),
    flash: () => insertFlashcardHtml(),
    explain: () => runQuickStudyHelp('explain'),
    quiz: () => runQuickStudyHelp('questions'),
    questions: () => runQuickStudyHelp('questions'),
    summary: () => runQuickStudyHelp('summarize'),
    summarize: () => runQuickStudyHelp('summarize'),
    proofread: () => runQuickStudyHelp('proofread'),
    derive: () => runQuickStudyHelp('derive'),
    debug: () => runQuickStudyHelp('debug'),
    formula: () => runStemTool('formula'),
    latex: () => openMathDialog(),
    statistics: () => runStemTool('statistics'),
    siUnits: () => runStemTool('siUnits'),
    labReport: () => runStemTool('labReport'),
    circuit: () => runStemTool('circuit'),
    draw: () => runStemTool('draw'),
    model: () => runStemTool('model'),
    heading: () => { captureEditorRange(); document.execCommand('formatBlock', false, 'h2'); $('#editor')?.dispatchEvent(new Event('input')); },
    bulletList: () => { captureEditorRange(); document.execCommand('insertUnorderedList'); $('#editor')?.dispatchEvent(new Event('input')); },
    checklist: () => runStemTool('checklist'),
    notation: () => runStemTool('notation'),
    harmony: () => runStemTool('chords'),
    rhythm: () => runStemTool('rhythm'),
    songAnalysis: () => insertUniversityTool('songAnalysis'),
    brainMap: () => runStemTool('brainMap'),
    memoryModel: () => runStemTool('memoryModel'),
    cognition: () => runStemTool('cognition'),
    experimentDesign: () => insertUniversityTool('experimentDesign'),
    robotFlow: () => runStemTool('robotFlow'),
    calculator: () => runStemTool('calculator'),
  };
  if (map[tool]) map[tool]();
  else if (runStemTool(tool)) return;
  else insertUniversityTool(tool);
}

function insertCapabilityTemplate(title, rows = []) {
  if (!$('#editor')) return alert('Åbn eller opret et dokument først.');
  openUniversityToolDialog(`capability-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, title, rows.length ? rows : ['Formål', 'Input', 'Arbejde', 'Resultat'], 'general');
}

function handleCapabilityAction(action, label) {
  const codeLanguages = { python: 'Python', cpp: 'C++', java: 'Java', arduino: 'Arduino', esp32: 'Arduino', ros: 'Python', code: 'JavaScript', 'run-code': 'Python' };
  const templateMap = {
    teaching: ['Teaching Mode', ['Læringsmål', 'Forklaring', 'Eksempel', 'Kontrolspørgsmål']],
    grade: ['Min eksamensparathed', ['Faglig præcision', 'Forklaring og sammenhæng', 'Aktiv genkaldelse', 'Næste træning']],
    'study-plan': ['Studieplan', ['Ugens mål', 'Læsning', 'Opgaver', 'Repetition']],
    focus: ['Fokus Mode', ['Dagens ene opgave', 'Forstyrrelser parkeres her', 'Resultat']],
    pomodoro: ['Pomodoro', ['Fokusblok 25 min', 'Pause 5 min', 'Antal gennemførte blokke']],
    spaced: ['Spaced Repetition', ['I dag', 'Om 3 dage', 'Om 7 dage', 'Om 21 dage']],
    progress: ['Fremskridtsoverblik', ['Mål', 'Status', 'Dokumentation', 'Næste milepæl']],
    tasks: ['Opgavegenerator', ['Opgave', 'Givne oplysninger', 'Det skal findes', 'Løsning']],
    'learning-path': ['Personligt læringsforløb', ['Startniveau', 'Delmål', 'Øvelser', 'Evaluering']],
    recommendations: ['Studieanbefalinger', ['Styrker', 'Fokusområde', 'Anbefalet øvelse', 'Deadline']],
    career: ['Karrierevejledning til STEM', ['Interesser', 'Kompetencer', 'Mulige roller', 'Næste erfaring']],
    datasheet: ['Datasheet-noter', ['Komponent', 'Forsyning', 'Pins', 'Grænseværdier', 'Kilde']],
    'arduino-library': ['Arduino bibliotek', ['Bibliotek', 'Installation', 'Vigtige metoder', 'Eksempelkode']],
    'sensor-library': ['Sensorbibliotek', ['Sensor', 'Måleområde', 'Nøjagtighed', 'Interface', 'Kalibrering']],
    breadboard: ['Breadboard editor', ['Forsyningsskinner', 'Komponenter', 'Forbindelser', 'Testpunkter']],
    'circuit-sim': ['Kredsløbssimulering', ['Input', 'Komponentværdier', 'Simuleret resultat', 'Målt resultat']],
    components: ['Komponentbibliotek', ['Komponent', 'Værdi', 'Footprint', 'Datasheet']],
    pcb: ['PCB preview', ['Board outline', 'Placering', 'Routing', 'Design rules']],
    oscilloscope: ['Oscilloskop-visning', ['Kanal', 'V/div', 'Tid/div', 'Trigger', 'Observation']],
    signal: ['Signalanalyse', ['Samplingfrekvens', 'Amplitude', 'Fase', 'Støj', 'Konklusion']],
    fft: ['FFT værktøj', ['Tidsdomæne', 'Frekvenspeaks', 'Sampling', 'Fortolkning']],
    kinematics: ['Kinematik', ['Koordinatsystem', 'Ledvariable', 'Transformation', 'Endeeffektor']],
    dynamics: ['Dynamik', ['Masse', 'Kræfter', 'Moment', 'Acceleration']],
    pid: ['PID tuning', ['Setpoint', 'Kp', 'Ki', 'Kd', 'Respons']],
    uml: ['UML diagram', ['Klasser', 'Ansvar', 'Relationer', 'Metoder']],
    flowchart: ['Flowchart', ['Start', 'Input', 'Beslutning', 'Proces', 'Output']],
    mindmap: ['Mindmap', ['Centralt emne', 'Begreber', 'Eksempler', 'Spørgsmål']],
    knowledge: ['Knowledge Graph', ['Kernebegreb', 'Forbindelser', 'Forudsætninger', 'Relaterede noter']],
    relations: ['Relationer mellem noter', ['Denne note bygger på', 'Relateret til', 'Fortsættes i']],
    links: ['Automatisk linking', ['Nøgleord', 'Relateret dokument', 'Hvorfor de hænger sammen']],
    'project-dashboard': ['Projektdashboard', ['Mål', 'Milepæle', 'Risici', 'Næste leverance']],
    kanban: ['Kanban board', ['To do', 'I gang', 'Test', 'Færdig']],
    'task-management': ['Opgavestyring', ['Opgave', 'Ansvarlig', 'Deadline', 'Status']],
    goals: ['Mål tracking', ['Mål', 'Målemetode', 'Status', 'Næste skridt']],
    research: ['Forskningsnoter', ['Forskningsspørgsmål', 'Metode', 'Fund', 'Usikkerheder', 'Referencer']],
    templates: ['STEM template', ['Problem', 'Teori', 'Metode', 'Beregning', 'Resultat', 'Refleksion']],
    references: ['Reference manager', ['Forfatter', 'Titel', 'År', 'DOI/URL', 'Anvendt i']],
    zotero: ['Zotero integration', ['Reference', 'Citatnøgle', 'Samling', 'Note']],
    collaboration: ['Samarbejde i realtid', ['Deltagere', 'Aftaler', 'Ændringer', 'Næste synkronisering']],
  };

  if (action.startsWith('pdf-')) return openPdfDialog(action.replace('pdf-', ''));
  if (action === 'misconceptions') return openPdfDialog('misconceptions');
  if (action === 'exam') return openExamDialog();
  if (action === 'mail') {
    const page = activePage();
    if (!page) return alert('Åbn en note først.');
    const subject = encodeURIComponent(page.title || "Note fra Note'it");
    const body = encodeURIComponent($('#editor')?.innerText || '');
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    return;
  }
  if (action === 'share') {
    const text = $('#editor')?.innerText || '';
    if (!text) return alert('Åbn en note, før den deles.');
    navigator.clipboard?.writeText(text);
    return alert('Noten er kopieret og klar til deling.');
  }
  if (action === 'search') return $('#globalSearch')?.focus();
  if (action === 'widgets') {
    data.ui.widgetsOpen = true; persist(); syncWidgetsVisibility(); return;
  }
  if (action === 'dark') {
    toggleDarkMode();
    return;
  }
  if (action === 'offline') return alert('Offline mode er aktiv: noter gemmes lokalt og service-worker cacher appen.');
  if (['cloud', 'mobile', 'tablet'].includes(action)) return insertCapabilityTemplate(label, ['Status', 'Krav', 'Synkronisering']);
  if (action === 'class-level') return openPageDialog();
  if (['feedback', 'tutor', 'explain', 'summary', 'questions', 'derive', 'debug', 'quiz', 'understood', 'help'].includes(action)) {
    const aiAction = action === 'quiz' || action === 'understood' ? 'questions' : action === 'feedback' || action === 'help' ? 'explain' : action === 'tutor' ? 'explain' : action;
    return runQuickStudyHelp(aiAction);
  }
  if (action === 'flash') return insertFlashcardHtml();
  if (action === 'graph') return runStemTool('graph');
  if (action === 'formula') return runStemTool('formula');
  if (action === 'calculator') return runStemTool('calculator');
  if (action === 'matrix') return runStemTool('matrix');
  if (action === 'convert') return runStemTool('convert');
  if (action === 'algebra') return runStemTool('algebra');
  if (action === 'latex') return openMathDialog();
  if (action === 'draw') return runStemTool('draw');
  if (action === 'labReport') return runStemTool('labReport');
  if (action === 'circuit') return runStemTool('circuit');
  if (['model', 'robot', 'mechanics'].includes(action)) return openModelDialog();
  if (codeLanguages[action]) return openCodeDialog(codeLanguages[action]);
  if (templateMap[action]) return insertCapabilityTemplate(templateMap[action][0], templateMap[action][1]);
  const category = capabilityGroups.find(group => group.items.some(item => item.action === action));
  const categoryRows = {
    'Læring og AI': ['Læringsmål', 'Materiale', 'Aktiv øvelse', 'Egen forklaring', 'Næste repetition'],
    'Matematik og kode': ['Problem eller krav', 'Input og antagelser', 'Metode eller algoritme', 'Kontrol og test', 'Resultat'],
    'Elektronik og robotik': ['System og krav', 'Parametre og enheder', 'Model eller opstilling', 'Test og måling', 'Resultat og fejlkilder'],
    '3D, diagrammer og projekt': ['Formål', 'Elementer', 'Relationer', 'Annotationer', 'Næste handling'],
    'Deling og platform': ['Formål', 'Deltagere eller enheder', 'Adgang og ansvar', 'Status', 'Næste synkronisering'],
  };
  return insertCapabilityTemplate(label, categoryRows[category?.title] || ['Formål', 'Input', 'Metode', 'Resultat', 'Næste handling']);
}

function renderPages() {}

function renderNotebookView() {
  if (!data.semesters.length) {
    return `<div class="notebook-view empty-notebook">
      <button type="button" class="notebook-cover notebook-start-cover" data-start-notebook>
        <span class="notebook-rings"></span><span class="notebook-brand">Note<sup>'it</sup></span>
        <span class="notebook-semester-title">${escapeHtml(U('startNotebook'))}</span>
        <span class="notebook-subtitle">${uiLang() === 'en' ? 'Choose degree, programme and colour' : 'Vælg grad, uddannelse og farve'}</span>
      </button>
      <p>${uiLang() === 'en' ? 'Click the notebook to create your first notebook.' : 'Klik på notesbogen for at oprette din første notesbog.'}</p>
    </div>`;
  }
  const shelves = [...data.semesters].sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map(semester => ({ semester, subjects: data.subjects.filter(subject => subject.semesterId === semester.id) }));
  const activeIndex = Math.min(Math.max(0, Number(data.ui.notebookIndex) || 0), shelves.length - 1);
  const shelf = shelves[activeIndex];
  const notebookName = shelf.semester.name || formatSemesterOption(shelf.semester);
  const educationLabel = shelf.semester.program === 'free' ? 'Fri notesbog' : formatSemesterOption(shelf.semester);
  return `<div class="notebook-view">
    <div class="notebook-scene">
      <div class="notebook-stack">
        <div class="notebook-cover" style="--notebook-color:${escapeHtml(shelf.semester.color || '#34312e')}">
          <span class="notebook-rings"></span>
          <div class="notebook-brand">Note<sup>'it</sup></div>
          <div class="notebook-semester-title editable-name" data-rename-notebook="${shelf.semester.id}" title="Klik for at omdøbe">${escapeHtml(notebookName)}</div>
          <div class="notebook-subtitle">${escapeHtml(educationLabel)} · Fag og forelæsningsnoter</div>
        </div>
        <button type="button" class="start-subject-stack" data-start-subject title="${escapeHtml(U('startSubject'))}"><span></span><span></span><span></span><b>${escapeHtml(U('startSubject'))}</b></button>
        <div class="notebook-papers">
          ${shelf.subjects.map((subject, index) => {
            const pages = data.pages.filter(page => page.subjectId === subject.id);
            const target = pages[0]?.id || '';
            return `<button type="button" class="notebook-paper" data-notebook-page="${target}" data-notebook-subject="${subject.id}" style="--paper-index:${index};--paper-color:${subject.color}">
              <span class="paper-tab"></span>
              <strong class="editable-name" data-rename-subject="${subject.id}" title="Klik for at omdøbe">${escapeHtml(subject.name)}</strong>
              <small>${pages.length} ${pages.length === 1 ? escapeHtml(U('notesOne')) : escapeHtml(U('notesMany'))}</small>
              <span class="paper-lines"></span>
            </button>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div class="notebook-pagination">
      <button type="button" data-notebook-direction="-1" ${activeIndex === 0 ? 'disabled' : ''}>←</button>
      <span>${escapeHtml(U('notebookCount'))} ${activeIndex + 1} ${escapeHtml(U('of'))} ${shelves.length} · ${escapeHtml(notebookName)}</span>
      <button type="button" data-notebook-direction="1" ${activeIndex === shelves.length - 1 ? 'disabled' : ''}>→</button>
    </div>
    <div class="notebook-actions">
      <button type="button" class="create-notebook-link" data-start-notebook>${escapeHtml(U('createNotebook'))}</button>
      <button type="button" class="delete-notebook-link" data-delete-notebook="${shelf.semester.id}">${escapeHtml(U('deleteNotebook'))}</button>
    </div>
    <div class="notebook-instruction">${escapeHtml(U('notebookInstruction'))}</div>
  </div>`;
}

function isEditorFullySelected(editor, selection) {
  if (!selection?.rangeCount) return false;
  const text = (editor.textContent || '').trim();
  if (!text) return true;
  const range = selection.getRangeAt(0);
  const full = document.createRange();
  full.selectNodeContents(editor);
  try {
    return range.compareBoundaryPoints(Range.START_TO_START, full) <= 0
      && range.compareBoundaryPoints(Range.END_TO_END, full) >= 0;
  } catch {
    return false;
  }
}

function clearEntireNotePage() {
  const page = activePage();
  const editor = $('#editor');
  if (!page || !editor) return;
  const empty = '<p><br></p>';
  page.sheets = [empty];
  page.sheetTitles = [];
  page.currentSheet = 0;
  page.html = empty;
  page.updated = new Date().toISOString();
  editor.innerHTML = page.pageView === 'continuous' ? '' : empty;
  if (page.pageView === 'continuous') {
    pageEditorNodes().forEach((node, index) => { node.innerHTML = page.sheets[index] || empty; });
  }
  persist();
  scheduleSave();
  resetEditorDeleteState();
  requestAnimationFrame(() => {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });
}

function ensurePageSheets(page) {
  if (!page) return;
  if (!Array.isArray(page.sheets) || !page.sheets.length) page.sheets = [page.html || '<p><br></p>'];
  if (!Array.isArray(page.sheetTitles)) page.sheetTitles = [];
  if (!Array.isArray(page.sheetTrash)) page.sheetTrash = [];
  page.sheetTitles = page.sheets.map((_, index) => /^Side \d+$/.test(page.sheetTitles[index] || '') ? '' : (page.sheetTitles[index] || ''));
  page.currentSheet = Math.max(0, Math.min(Number(page.currentSheet) || 0, page.sheets.length - 1));
  page.paperZoom = Math.max(70, Math.min(150, Number(page.paperZoom) || 100));
  if (page.pageView === 'continuous' && page.sheets.length === 1 && page.sheets[0]?.includes('page-break-visual')) {
    page.sheets = splitContinuousEditorHtml(page.sheets[0]);
  }
}

function pageEditorNodes() {
  const continuous = [...document.querySelectorAll('.continuous-pages .sheet-editor')];
  if (continuous.length) return continuous;
  const editor = $('#editor');
  return editor ? [editor] : [];
}

function primaryEditor() {
  return $('#editor') || document.querySelector('.sheet-editor');
}

function editorFromNode(node) {
  return node?.nodeType === Node.ELEMENT_NODE
    ? node.closest?.('#editor, .sheet-editor')
    : node?.parentElement?.closest?.('#editor, .sheet-editor') || null;
}

function focusedEditor() {
  const active = document.activeElement;
  return editorFromNode(active) || primaryEditor();
}

function updatePaperPageCounter() {
  const page = activePage();
  const counter = document.querySelector('.page-counter');
  if (!page || !counter) return;
  const sheetCount = Math.max(1, page.sheets?.length || 1);
  const currentSheet = Number(page.currentSheet || 0);
  counter.textContent = page.pageView === 'infinite'
    ? 'Langt ark'
    : page.pageView === 'continuous'
      ? `Alle ${sheetCount} sider`
      : page.pageView === 'book'
        ? `Spiralbog · Side ${currentSheet + 1} af ${sheetCount}`
        : `Side ${currentSheet + 1} af ${sheetCount}`;
}

function editorDocumentText() {
  const text = pageEditorNodes().map(node => node.innerText || '').join('\n\n').trim();
  if (text) return text;
  return ($('#editor')?.innerText || '').trim();
}

function closeAppDialog(targetName) {
  if (!targetName) return;
  if (targetName === 'examPrep') closeExamActivity();
  if (targetName === 'exam') closeExamPlanSubject();
  hideEditorAiLoading();
  hideSelectionHelper();
  hideSpellContextMenu();
  hideFactExplainPopover();
  const dialog = document.getElementById(`${targetName}Dialog`);
  if (dialog) dialog.close();
}

function closeNearestDialog(fromNode) {
  const dialog = fromNode?.closest?.('dialog');
  if (!dialog) return;
  if (dialog.id === 'examPrepDialog') closeExamActivity();
  if (dialog.id === 'examDialog') closeExamPlanSubject();
  hideEditorAiLoading();
  hideSelectionHelper();
  hideSpellContextMenu();
  hideFactExplainPopover();
  if (fromNode?.matches?.('[data-close-reward]')) {
    dialog.close();
    dialog.remove();
    return;
  }
  dialog.close();
}

function initUniversalCloseHandlers() {
  document.addEventListener('click', event => {
    const btn = event.target.closest(
      '[data-close], [data-close-fact-explain], [data-layout-close], [data-shortcut-close], [data-academic-close], [data-formula-library-close], [data-music-notation-close], [data-equation-close], [data-university-tool-close], [data-close-reward], [data-image-choice="close"], .modal-close, .exam-activity-close'
    );
    if (!btn) return;
    event.preventDefault();
    if (btn.matches('[data-close-fact-explain]')) {
      hideFactExplainPopover();
      return;
    }
    let target = btn.dataset.close;
    if (!target) {
      const dialog = btn.closest('dialog');
      if (dialog?.id?.endsWith('Dialog')) target = dialog.id.slice(0, -6);
    }
    if (target) closeAppDialog(target);
    else closeNearestDialog(btn);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const openDialogs = [...document.querySelectorAll('dialog[open]')];
    if (!openDialogs.length) return;
    const topDialog = openDialogs[openDialogs.length - 1];
    const target = topDialog.id?.endsWith('Dialog') ? topDialog.id.slice(0, -6) : '';
    if (target) closeAppDialog(target);
  });

  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const target = dialog.id?.endsWith('Dialog') ? dialog.id.slice(0, -6) : '';
      if (target) closeAppDialog(target);
    });
  });
}

function paperDragArticle(index) {
  return document.querySelector(`.continuous-paper[data-drag-sheet="${index}"]`)
    || document.querySelector('#notePaper')
    || document.querySelector(`.stack-sheet-layer[data-drag-sheet="${index}"]`);
}

function pushSheetToRecentlyDeleted(page, item) {
  data.trash ||= [];
  data.trash.unshift({
    id: uid(),
    subjectId: page.subjectId,
    title: `${page.title || 'Note'} · ${item.title}`,
    html: item.html,
    sheets: [item.html],
    sheetTitles: [item.title],
    deletedAt: new Date().toISOString(),
    language: page.language,
    docType: page.docType,
  });
}

function deleteSheet(index) {
  const page = activePage();
  if (!page) return;
  ensurePageSheets(page);
  if (page.sheets.length <= 1) {
    movePageToTrash(page.id);
    persist();
    render();
    return;
  }
  const safeIndex = Math.max(0, Math.min(Number(index) || 0, page.sheets.length - 1));
  const trashedItem = {
    id: uid(),
    html: page.sheets[safeIndex],
    title: page.sheetTitles[safeIndex] || `Side ${safeIndex + 1}`,
    trashedAt: new Date().toISOString(),
  };
  page.sheetTrash.unshift(trashedItem);
  pushSheetToRecentlyDeleted(page, trashedItem);
  page.sheets.splice(safeIndex, 1);
  page.sheetTitles.splice(safeIndex, 1);
  page.currentSheet = Math.max(0, Math.min(page.currentSheet > safeIndex ? page.currentSheet - 1 : page.currentSheet, page.sheets.length - 1));
  page.html = page.sheets.join('<div class="page-break"></div>');
  page.updated = new Date().toISOString();
  persist();
  renderWorkspace();
  renderWidgets();
  renderRecentlyDeleted();
}

function emptySheetTrash() {
  const page = activePage();
  if (!page?.sheetTrash?.length) return;
  page.sheetTrash = [];
  persist();
  renderWidgets();
}

function syncEditorToPage(editor, page) {
  if (!editor || !page) return;
  ensurePageSheets(page);
  if (page.pageView === 'continuous') {
    const editors = pageEditorNodes();
    page.sheets = editors.length
      ? editors.map(node => node.innerHTML || '<p><br></p>')
      : splitContinuousEditorHtml(editor.innerHTML);
    if (!page.sheets.length) page.sheets = ['<p><br></p>'];
  } else if (page.pageView === 'infinite') {
    page.sheets = [editor.innerHTML || '<p><br></p>'];
    page.currentSheet = 0;
  } else {
    page.sheets[page.currentSheet] = editor.innerHTML || '<p><br></p>';
  }
  page.html = page.sheets.join('<div class="page-break"></div>');
  page.updated = new Date().toISOString();
}

function buildContinuousEditorHtml(sheets = []) {
  return sheets.map(sheet => sheet || '<p><br></p>').join('');
}

function sheetEditorOverflows(editor) {
  return editor && editor.scrollHeight > editor.clientHeight + 6;
}

function sheetEditorHasRoom(editor) {
  return editor && editor.scrollHeight <= editor.clientHeight - 48;
}

function paginateContinuousSheets() {
  const page = activePage();
  if (!page || page.pageView !== 'continuous' || page.viewMode === 'annotate') return;
  ensurePageSheets(page);
  let editors = pageEditorNodes();
  if (!editors.length) return;
  let changed = false;

  for (let i = 0; i < editors.length; i++) {
    const editor = editors[i];
    while (sheetEditorOverflows(editor)) {
      const last = editor.lastElementChild;
      if (!last) break;
      if (editor.children.length === 1 && !(last.textContent || '').replace(/\u200b/g, '').trim() && !last.querySelector?.('img, svg, .embedded-model, .music-staff-insert, .code-block, .sticky-note')) break;
      const overflow = last.outerHTML;
      last.remove();
      if (!page.sheets[i + 1]) {
        page.sheets.push('<p><br></p>');
        page.sheetTitles[i + 1] ||= '';
      }
      page.sheets[i + 1] = overflow + (page.sheets[i + 1] || '');
      if (i + 1 >= editors.length) {
        page.sheets[i] = editor.innerHTML || '<p><br></p>';
        page.html = page.sheets.join('<div class="page-break"></div>');
        persist();
        renderWorkspace();
        setTimeout(paginateContinuousSheets, 0);
        return;
      }
      editors[i + 1].innerHTML = page.sheets[i + 1];
      changed = true;
    }
    page.sheets[i] = editor.innerHTML || '<p><br></p>';
  }

  editors = pageEditorNodes();
  for (let i = 0; i < editors.length - 1; i++) {
    const editor = editors[i];
    const nextEditor = editors[i + 1];
    while (sheetEditorHasRoom(editor) && nextEditor.children.length > 0) {
      const first = nextEditor.firstElementChild;
      if (!first) break;
      const onlyEmpty = nextEditor.children.length === 1 && !(first.textContent || '').replace(/\u200b/g, '').trim();
      if (onlyEmpty) break;
      editor.appendChild(first);
      page.sheets[i] = editor.innerHTML;
      page.sheets[i + 1] = nextEditor.innerHTML || '<p><br></p>';
      changed = true;
    }
  }

  while (page.sheets.length > 1) {
    const lastIndex = page.sheets.length - 1;
    const empty = !(page.sheets[lastIndex] || '').replace(/<[^>]+>/g, '').replace(/\u200b/g, '').trim();
    if (!empty) break;
    page.sheets.pop();
    page.sheetTitles.pop();
    changed = true;
    document.querySelector(`.continuous-paper[data-drag-sheet="${lastIndex}"]`)?.remove();
  }

  if (changed) {
    page.html = page.sheets.join('<div class="page-break"></div>');
    persist();
    updatePaperPageCounter();
  }
}

function splitContinuousEditorHtml(html = '') {
  const root = document.createElement('div');
  root.innerHTML = html || '<p><br></p>';
  const sheets = [];
  let bucket = document.createElement('div');
  [...root.childNodes].forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE && node.matches?.('.page-break-visual, .page-break')) {
      sheets.push(bucket.innerHTML.trim() || '<p><br></p>');
      bucket = document.createElement('div');
      return;
    }
    bucket.appendChild(node.cloneNode(true));
  });
  sheets.push(bucket.innerHTML.trim() || '<p><br></p>');
  return sheets.filter((sheet, index, all) => sheet || all.length === 1 || index < all.length - 1);
}

function ensureEditorNotEmpty(editor) {
  if (!editor) return;
  const text = (editor.textContent || '').replace(/\u200b/g, '').trim();
  if (!text && !editor.querySelector('img, svg, .embedded-model, .music-staff-insert, .code-block, .sticky-note')) {
    editor.innerHTML = '<p><br></p>';
  }
}

function resetEditorDeleteState() {
  pendingFullDocumentSelectAll = false;
  pendingFullNoteDelete = false;
}

function deleteSelectedEditorContent(editor) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;
  range.deleteContents();
  ensureEditorNotEmpty(editor);
  selection.removeAllRanges();
  selection.addRange(range);
  syncEditorToPage(editor, activePage());
  editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
  return true;
}

function syncActiveSheet() {
  const page = activePage();
  const editor = primaryEditor();
  if (!page || !editor) return;
  syncEditorToPage(editor, page);
}

function paginateActiveSheet() {
  const page = activePage();
  const editor = $('#editor');
  if (!page || !editor || page.viewMode === 'annotate' || page.pageView === 'infinite' || page.pageView === 'continuous') return;
  ensurePageSheets(page);
  let moved = false;
  while (editor.scrollHeight > editor.clientHeight + 6 && editor.children.length > 1) {
    const last = editor.lastElementChild;
    if (!last) break;
    const overflow = last.outerHTML;
    last.remove();
    page.sheets[page.currentSheet + 1] = overflow + (page.sheets[page.currentSheet + 1] || '');
    moved = true;
  }
  page.sheets[page.currentSheet] = editor.innerHTML;
  page.html = page.sheets.join('<div class="page-break"></div>');
  if (moved) {
    page.currentSheet = Math.min(page.currentSheet + 1, page.sheets.length - 1);
    persist();
    renderWorkspace();
    setTimeout(() => {
      const nextEditor = $('#editor');
      if (!nextEditor) return;
      nextEditor.focus();
      const range = document.createRange();
      range.selectNodeContents(nextEditor);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      paginateActiveSheet();
    }, 40);
  }
}

let bookFlipping = false;
const BOOK_LINE_HEIGHT = 29;

function bookLinesOn(page) {
  return page?.bookLines !== false;
}

function normalizeBookEditorLines(editor) {
  if (!editor || !bookLinesOn(activePage())) return;
  editor.querySelectorAll(':scope > *').forEach(block => {
    block.style.margin = '0';
    block.style.lineHeight = `${BOOK_LINE_HEIGHT}px`;
    block.style.minHeight = `${BOOK_LINE_HEIGHT}px`;
  });
}

function flipBookPage(direction) {
  if (bookFlipping) return false;
  const page = activePage();
  if (!page || page.pageView !== 'book') return false;
  syncActiveSheet();
  const next = page.currentSheet + direction;
  if (next < 0 || next >= page.sheets.length) return false;
  const notebook = $('.spiral-notebook');
  const currentEl = $('.book-page-current');
  if (!notebook || !currentEl) {
    page.currentSheet = next;
    page.html = page.sheets.join('<div class="page-break"></div>');
    persist();
    renderWorkspace();
    return true;
  }

  bookFlipping = true;
  const linesClass = bookLinesOn(page) ? 'book-lines-on' : 'book-lines-off';
  const stage = $('.book-page-stage') || notebook;
  const underEl = document.createElement('article');
  underEl.className = `paper spiral-paper book-page book-page-under ${linesClass}`;
  underEl.innerHTML = `<div class="book-page-curl" aria-hidden="true"></div><div class="editor book-editor ${linesClass}" aria-hidden="true">${page.sheets[next] || '<p><br></p>'}</div>`;
  stage.insertBefore(underEl, currentEl);

  const edgeSheet = direction > 0
    ? $('.book-edge-sheet')
    : document.querySelector('.book-left-stack .book-left-sheet:last-child');
  const outClass = direction > 0 ? 'book-page-turn-out-next' : 'book-page-turn-out-prev';
  const underClass = direction > 0 ? 'book-page-under-next' : 'book-page-under-prev';
  currentEl.classList.add(outClass);
  underEl.classList.add(underClass);
  if (edgeSheet) edgeSheet.classList.add(direction > 0 ? 'book-edge-peel-next' : 'book-left-peel-prev');

  const finish = () => {
    if (!bookFlipping) return;
    bookFlipping = false;
    page.currentSheet = next;
    page.html = page.sheets.join('<div class="page-break"></div>');
    persist();
    renderWorkspace();
    requestAnimationFrame(() => {
      const newEl = $('.book-page-current');
      if (!newEl) return;
      const inClass = direction > 0 ? 'book-page-turn-in-next' : 'book-page-turn-in-prev';
      newEl.classList.add(inClass);
      newEl.addEventListener('animationend', () => newEl.classList.remove(inClass), { once: true });
      normalizeBookEditorLines(primaryEditor());
      primaryEditor()?.focus();
    });
  };
  currentEl.addEventListener('animationend', finish, { once: true });
  setTimeout(finish, 820);
  return true;
}

function initBookView() {
  const page = activePage();
  if (!page || page.pageView !== 'book') return;
  const editor = primaryEditor();
  if (editor) {
    normalizeBookEditorLines(editor);
    if (editor.dataset.bookEditorBound !== '1') {
      editor.dataset.bookEditorBound = '1';
      editor.addEventListener('input', () => normalizeBookEditorLines(editor));
      editor.addEventListener('keydown', event => {
        if (event.key !== 'Enter' || event.shiftKey || !bookLinesOn(activePage())) return;
        setTimeout(() => normalizeBookEditorLines(editor), 0);
      });
    }
  }
  document.querySelectorAll('.book-flip-hit, .book-page-curl').forEach(zone => {
    if (zone.dataset.bookSwipeBound === '1') return;
    zone.dataset.bookSwipeBound = '1';
    let startX = 0;
    zone.addEventListener('pointerdown', event => { startX = event.clientX; });
    zone.addEventListener('pointerup', event => {
      const dx = event.clientX - startX;
      if (Math.abs(dx) < 48) return;
      if (dx < 0) flipBookPage(1);
      else flipBookPage(-1);
    });
  });
}

function renderBookPaper(page, paperClasses, lockButton, editable, editorAttrs) {
  const current = page.currentSheet;
  const sheetCount = page.sheets.length;
  const linesOn = bookLinesOn(page);
  const linesClass = linesOn ? 'book-lines-on' : 'book-lines-off';
  const spiralRings = Array.from({ length: 17 }, (_, index) => `<span class="spiral-ring" style="--ring-i:${index}"></span>`).join('');
  const leftPages = page.sheets.slice(0, current).map((_, index) => {
    const depth = current - index;
    return `<div class="book-left-sheet ${linesOn ? 'book-sheet-lined' : ''}" style="--depth:${depth}" aria-hidden="true"></div>`;
  }).join('');
  const rightCount = Math.min(Math.max(0, sheetCount - current - 1), 28);
  const rightPages = Array.from({ length: rightCount }, (_, index) =>
    `<div class="book-edge-sheet ${linesOn ? 'book-sheet-lined' : ''}" style="--edge-i:${index};--edge-total:${rightCount}" data-edge-sheet="${current + 1 + index}" aria-hidden="true"></div>`
  ).join('');
  return `<div class="paper-zoom-shell book-desk-shell" style="--paper-zoom:${page.paperZoom / 100}">
    <div class="book-desk">
      <div class="desk-pencil" aria-hidden="true"></div>
      <div class="spiral-notebook">
        <div class="spiral-binding" aria-hidden="true">${spiralRings}</div>
        <div class="book-page-column">
          <div class="book-left-stack">${leftPages}</div>
          <div class="book-page-stage">
            <article class="${paperClasses} book-page book-page-current spiral-paper ${linesClass}" id="notePaper" data-drag-sheet="${current}" title="Træk eller blad som i en notesbog">
              ${lockButton}
              <div class="book-page-curl" aria-hidden="true"></div>
              <div class="editor book-editor ${linesClass}" id="editor" contenteditable="${editable}" ${editorAttrs}>${page.sheets[current] || '<p><br></p>'}</div>
              <span class="book-page-number">Side ${current + 1} af ${sheetCount}</span>
              ${current > 0 ? '<button type="button" class="book-flip-hit book-flip-hit-prev" data-book-flip="-1" aria-label="Blad bagud"></button>' : ''}
              ${current < sheetCount - 1 ? '<button type="button" class="book-flip-hit book-flip-hit-next" data-book-flip="1" aria-label="Blad frem"></button>' : ''}
            </article>
          </div>
          <div class="book-edge-stack">${rightPages}</div>
          ${current < sheetCount - 1 ? '<div class="book-corner-hint" aria-hidden="true">Blad →</div>' : ''}
        </div>
      </div>
    </div>
  </div>`;
}

function renderPagedPaper(page, annotationMode) {
  ensurePageSheets(page);
  const guestLocked = false;
  const editable = !annotationMode && !guestLocked;
  const proofread = page.proofreading !== false;
  const editorAttrs = `lang="${page.language || appSettings.defaultLanguage}" spellcheck="${proofread}" autocorrect="${proofread ? 'on' : 'off'}" autocomplete="${proofread ? 'on' : 'off'}" autocapitalize="sentences" inputmode="text" enterkeyhint="enter" data-scribble-target="note"`;
  const lockButton = guestLocked ? '<button type="button" class="guest-editor-lock" data-guest-write>Log ind eller opret bruger for at skrive</button>' : '';
  const paperClasses = `paper paged-paper paper-corners-${escapeHtml(page.paperCorners || 'round')} note-layout-${escapeHtml(page.layout || 'classic')} paper-pattern-${escapeHtml(page.paperPattern || 'dots')} list-marker-${escapeHtml(page.listMarker || 'bullet')} paper-size-${escapeHtml(page.paperSize || 'responsive')} ${annotationMode ? 'annotation-mode' : ''} ${guestLocked ? 'guest-readonly-paper' : ''}`;
  if (page.pageView === 'infinite') {
    return `<div class="paper-zoom-shell infinite-paper-shell" style="--paper-zoom:${page.paperZoom / 100}">
      <article class="${paperClasses} infinite-paper" id="notePaper" data-drag-sheet="0" title="Træk papiret til papirkurven">
        ${lockButton}<div class="editor" id="editor" contenteditable="${editable}" ${editorAttrs}>${page.sheets[0] || '<p><br></p>'}</div>
      </article>
    </div>`;
  }
  if (page.pageView === 'book') {
    return renderBookPaper(page, paperClasses, lockButton, editable, editorAttrs);
  }
  if (page.pageView === 'continuous') {
    return `<div class="paper-zoom-shell continuous-unified-shell" style="--paper-zoom:${page.paperZoom / 100}">
      <div class="continuous-pages">
        ${page.sheets.map((sheet, index) => `
          <article class="${paperClasses} continuous-paper" ${index === 0 ? 'id="notePaper"' : ''} data-drag-sheet="${index}" title="Træk papiret til papirkurven">
            ${index === 0 ? lockButton : ''}
            <div class="editor sheet-editor" ${index === 0 ? 'id="editor"' : ''} data-sheet-editor="${index}" contenteditable="${editable}" ${editorAttrs}>${sheet || '<p><br></p>'}</div>
            <span class="paper-page-number">Side ${index + 1}</span>
          </article>
        `).join('')}
      </div>
    </div>`;
  }
  const stackLayers = page.pageView === 'stack'
    ? page.sheets.map((_, index) => {
      if (index === page.currentSheet) return '';
      const offset = (index + 1) * 6;
      const tilt = (index - (page.sheets.length - 1) / 2) * 0.18;
      return `<button type="button" class="stack-sheet-layer" data-stack-sheet="${index}" draggable="true" data-drag-sheet="${index}" style="--stack-neg:-${offset}px;--stack-pos:${offset}px;--stack-tilt:${tilt}deg;--stack-z:${index + 2}" title="Side ${index + 1}"></button>`;
    }).join('')
    : '';
  const stackIndex = page.pageView === 'stack' ? `<nav class="stack-page-index" aria-label="Sider i papirstakken">
    ${page.sheets.map((_, index) => `<label class="${index === page.currentSheet ? 'active' : ''}" style="--tab-index:${index}" draggable="${page.sheets.length > 1}" data-drag-sheet="${index}">
      <button type="button" data-stack-sheet="${index}" aria-label="Åbn side ${index + 1}">${index + 1}</button>
      <input type="text" data-sheet-title="${index}" value="${escapeHtml(/^Side \d+$/.test(page.sheetTitles[index] || '') ? '' : page.sheetTitles[index])}" placeholder="Skriv overskrift" aria-label="Overskrift til side ${index + 1}">
    </label>`).join('')}
  </nav>` : '';
  return `<div class="paper-zoom-shell" style="--paper-zoom:${page.paperZoom / 100}"><div class="paper-stage ${page.pageView === 'stack' ? 'paper-stack-mode' : ''}">
    ${stackLayers}
    <article class="${paperClasses}" id="notePaper" data-drag-sheet="${page.currentSheet}" title="Træk papiret til papirkurven">
      ${lockButton}<div class="editor" id="editor" contenteditable="${editable}" ${editorAttrs}>${page.sheets[page.currentSheet] || '<p><br></p>'}</div>
      <span class="paper-page-number">Side ${page.currentSheet + 1}</span>
      ${annotationMode ? `<canvas class="annotation-canvas" id="annotationCanvas"></canvas>
        <div class="pdf-comment-layer">${page.pdfComments.map((comment, i) => `<button type="button" class="pdf-pin" style="left:${comment.x}%;top:${comment.y}%" data-pdf-comment="${i}" title="${escapeHtml(comment.text)}">${i + 1}</button>`).join('')}</div>` : ''}
    </article>
    ${stackIndex}
  </div></div>`;
}

function renderWorkspace() {
  const ws = $('#workspace');
  if (!ws) return;
  document.querySelector('.main-area')?.classList.toggle('notebook-mode', data.ui.view === 'notebook');
  if (data.ui.view === 'notebook') {
    ws.innerHTML = renderNotebookView();
    return;
  }
  const page = activePage();
  const subj = activeSubject();

  if (!subj) {
    ws.innerHTML = `<div class="no-page"><h2>Velkommen</h2><p>Klik på et fag til venstre, tryk derefter <strong>+</strong> for at oprette dit første dokument.</p><button type="button" class="btn-primary" id="quickStart">+ Opret fag</button></div>`;
    return;
  }

  if (!page) {
    ws.innerHTML = `<div class="no-page"><h2>${escapeHtml(subj.name)}</h2><p>Tryk <strong>+</strong> ved faget for at oprette dit første dokument.</p><button type="button" class="btn-primary" id="quickAddPage">+ Nyt dokument</button></div>`;
    return;
  }

  const lang = page.language || appSettings.defaultLanguage || 'da';
  const tbExpanded = data.ui.toolbarExpanded;
  const cfg = docTypes[page.docType] || docTypes.general;
  const pageTypeLabel = pageDocTypeLabel(page);
  ensurePageSheets(page);
  const guideHtml = '';
  const annotationMode = page.viewMode === 'annotate';
  ws.innerHTML = `
    ${renderEditorTabs()}
    <div class="document-shell${page.pageView === 'book' ? ' book-mode' : ''}">
      <div class="doc-top"><span>${escapeHtml(subj.name)} · ${escapeHtml(pageTypeLabel)} · Oprettet ${formatDate(page.created || page.updated)}${appBuildLabel() ? ` · <span class="app-build-tag">Build ${escapeHtml(appBuildLabel())}</span>` : ''}</span><span class="save-state" id="saveState"><span class="save-dot ${isGuest() ? 'local' : ''}"></span>${isGuest() ? ' Demo · ikke gemt' : ' Gemt'}</span></div>
      ${guideHtml}
      <div class="doc-header">
        <input class="title-input" id="pageTitle" value="${escapeHtml(page.title)}" placeholder="Dokumenttitel">
        <div class="deadline-wrap">
          <input class="date-input" id="pageDeadline" type="date" value="${page.deadline || ''}" title="Deadline">
        </div>
        <select class="note-language" id="pageLanguage">${languageOptions(lang)}</select>
        <button type="button" class="btn-translate-note" id="translateNoteBtn" title="Oversæt noter">⟳ Oversæt</button>
      </div>
      <div class="toolbar-panel ${tbExpanded ? 'expanded' : 'compact'}" id="toolbarPanel">
        ${renderToolbarHtml(lang, tbExpanded, page)}
      </div>
      <div class="editor-workspace-stage">
        ${renderPagedPaper(page, annotationMode)}
        <div id="editorAiOverlay" class="editor-ai-overlay" hidden></div>
      </div>
      ${(page.comments || []).length ? `<section id="comments" class="answer-board"><header class="answer-board-head"><div><span>✦</span><h3>Studiehjælp</h3></div><small>Spørg videre, gem eller slet dine opslag</small></header><div class="answer-board-grid">${page.comments.map((c, i) => `
        <article class="comment-card answer-note answer-color-${i % 4}">
          <span class="answer-pin"></span>
          <header><span>${escapeHtml((c.type || 'Studiehjælp').replace(/AI hjælp/gi, 'Studiehjælp'))}${c.from === 'markering' ? ' · markeret tekst' : ` · linje ${c.from} til ${c.to}`}</span><button type="button" class="page-delete" data-delete-comment="${i}" title="Slet opslag">×</button></header>
          <div class="answer-text">${escapeHtml(c.text).replace(/\n/g, '<br>')}</div>
          <div class="answer-actions">
            ${c.replacement ? `<button type="button" data-apply-comment="${i}">Anvend rettelse</button>` : ''}
            <button type="button" data-insert-answer="${i}" data-mode="text">Indsæt som tekst</button>
            <button type="button" data-insert-answer="${i}" data-mode="sticky">Som sticky note</button>
            <button type="button" class="delete-answer-action" data-delete-comment="${i}">Slet opslag</button>
          </div>
          <div class="answer-followup"><input type="text" data-follow-input="${i}" placeholder="Spørg videre om svaret..."><button type="button" data-follow-answer="${i}">Spørg videre</button></div>
        </article>`).join('')}</div></section>` : ''}
    </div>`;

  bindEditor();
  renderMathInEditor();
  if (annotationMode) setTimeout(initAnnotationCanvas, 30);
  else setTimeout(() => primaryEditor()?.focus(), 50);
  if (activePage()?.pageView === 'continuous') setTimeout(paginateContinuousSheets, 40);
  else if (activePage()?.pageView === 'book') setTimeout(initBookView, 50);
}

function applyMarkerColor(color) {
  const ed = $('#editor');
  if (!ed) return;
  ed.focus();
  if (editorRange) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(editorRange);
  }
  document.execCommand('hiliteColor', false, color);
  ed.dispatchEvent(new Event('input'));
}

function pointerCanvasPoint(event, box) {
  return {
    x: (event.clientX - box.left) / box.width,
    y: (event.clientY - box.top) / box.height,
    pressure: event.pressure || (event.pointerType === 'pen' ? .5 : .35),
  };
}

function pointerStrokeWidth(tool, event) {
  const pressure = Math.max(.2, Math.min(1, event.pressure || (event.pointerType === 'pen' ? .55 : .45)));
  if (tool === 'marker') return event.pointerType === 'pen' ? 10 + pressure * 10 : 14;
  return event.pointerType === 'pen' ? 1.8 + pressure * 4.2 : 3;
}

function initAnnotationCanvas() {
  const canvas = $('#annotationCanvas');
  const paper = $('#notePaper');
  const page = activePage();
  if (!canvas || !paper || !page) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = paper.getBoundingClientRect();
  canvas.width = Math.max(1, rect.width * ratio);
  canvas.height = Math.max(1, rect.height * ratio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  const ctx = canvas.getContext('2d');
  canvas.dataset.tool = activeWritingTool.type === 'pointer' ? 'marker' : activeWritingTool.type;
  canvas.dataset.color = canvas.dataset.tool === 'pen' ? '#1f2937' : activeWritingTool.color || canvas.dataset.color || '#f8d878';
  ctx.scale(ratio, ratio);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const drawStroke = stroke => {
    if (!stroke.points?.length) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color || '#e9bd48';
    ctx.lineWidth = stroke.width || 12;
    ctx.globalAlpha = stroke.tool === 'marker' ? .34 : .88;
    stroke.points.forEach((point, i) => i ? ctx.lineTo(point.x * rect.width, point.y * rect.height) : ctx.moveTo(point.x * rect.width, point.y * rect.height));
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  page.inkStrokes.forEach(drawStroke);
  let current = null;
  canvas.onpointerdown = event => {
    event.preventDefault();
    const tool = canvas.dataset.tool || 'marker';
    if (tool === 'eraser') {
      const box = canvas.getBoundingClientRect();
      const point = pointerCanvasPoint(event, box);
      let closest = -1;
      let closestDistance = .045;
      page.inkStrokes.forEach((stroke, strokeIndex) => {
        (stroke.points || []).forEach(strokePoint => {
          const distance = Math.hypot(strokePoint.x - point.x, strokePoint.y - point.y);
          if (distance < closestDistance) { closest = strokeIndex; closestDistance = distance; }
        });
      });
      if (closest >= 0) {
        page.inkStrokes.splice(closest, 1);
        persist();
        initAnnotationCanvas();
      }
      return;
    }
    if (tool === 'comment') {
      const text = prompt('Skriv kommentar til dette sted:');
      if (text?.trim()) {
        const box = canvas.getBoundingClientRect();
        const point = pointerCanvasPoint(event, box);
        page.pdfComments.push({ x: point.x * 100, y: point.y * 100, text: text.trim() });
        persist();
        renderWorkspace();
      }
      return;
    }
    const box = canvas.getBoundingClientRect();
    current = { tool, color: tool === 'pen' ? '#1f2937' : canvas.dataset.color || '#f8d878', width: pointerStrokeWidth(tool, event), points: [] };
    page.inkStrokes.push(current);
    canvas.setPointerCapture?.(event.pointerId);
    current.points.push(pointerCanvasPoint(event, box));
  };
  canvas.onpointermove = event => {
    if (!current) return;
    event.preventDefault();
    const box = canvas.getBoundingClientRect();
    current.points.push(pointerCanvasPoint(event, box));
    ctx.clearRect(0, 0, rect.width, rect.height);
    page.inkStrokes.forEach(drawStroke);
  };
  canvas.onpointerup = () => { current = null; persist(); };
}

function exportActiveNotePdf() {
  const page = activePage();
  if (!page) return;
  syncActiveSheet();
  ensurePageSheets(page);
  const sheets = page.sheets?.length ? page.sheets : [page.html || ''];
  const notePages = sheets.map((sheet, index) => `
    <section class="print-sheet">
      <header><span>${escapeHtml(page.title || 'Note')}</span><small>Side ${index + 1} af ${sheets.length}</small></header>
      <main>${sanitizeUserHtml(sheet)}</main>
    </section>`).join('');
  const frame = document.createElement('iframe');
  frame.className = 'note-print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(page.title || 'Note')}</title><style>
    @page{size:A4;margin:16mm}
    *{box-sizing:border-box}
    body{margin:0;color:#211d18;background:#ece8e1;font:16px/1.6 Georgia,serif}
    .print-sheet{width:210mm;min-height:297mm;margin:18px auto;padding:18mm 17mm;background:#fff;box-shadow:0 8px 28px rgba(45,35,25,.12);break-after:page}
    .print-sheet:last-child{break-after:auto}
    .print-sheet header{display:flex;justify-content:space-between;padding-bottom:10px;margin-bottom:20px;border-bottom:1px solid #ddd4c8;font:12px/1.4 Arial,sans-serif;color:#746b61}
    .print-sheet header span{font-weight:700}.print-sheet main{white-space:normal}
    h1{font-size:30px}h2{font-size:23px}h3{font-size:19px}img,svg,canvas{max-width:100%}pre,code{white-space:pre-wrap}
    @media print{body{background:#fff}.print-sheet{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none}}
  </style></head><body>${notePages}</body></html>`;
  frame.onload = () => {
    setTimeout(() => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } finally {
        setTimeout(() => frame.remove(), 1200);
      }
    }, 120);
  };
  document.body.appendChild(frame);
}

function sanitizeUserHtml(html) {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  parsed.querySelectorAll('script, iframe, object, embed, link, meta').forEach(node => node.remove());
  parsed.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return parsed.body.innerHTML;
}

const PASTE_ALLOWED_TAGS = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'A', 'CODE', 'PRE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);

function cleanPastedHtml(html) {
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
  parsed.querySelectorAll('script, style, iframe, object, embed, link, meta, head, title, img, svg').forEach(node => node.remove());
  const walk = node => {
    [...node.children].forEach(walk);
    const tag = node.tagName;
    if (!PASTE_ALLOWED_TAGS.has(tag)) {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      return;
    }
    [...node.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const keep = (tag === 'A' && name === 'href' && !attribute.value.trim().toLowerCase().startsWith('javascript:'));
      if (!keep) node.removeAttribute(attribute.name);
    });
  };
  [...parsed.body.children].forEach(walk);
  return parsed.body.innerHTML;
}


function scheduleSave() {
  const el = $('#saveState');
  if (el) el.innerHTML = 'Gemmer...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist();
    renderPages();
  }, 400);
}

function scheduleWidgets() {
  clearTimeout(widgetsTimer);
  widgetsTimer = setTimeout(renderWidgets, 250);
}

function schedulePagination() {
  clearTimeout(paginationTimer);
  paginationTimer = setTimeout(() => {
    const p = activePage();
    if (!p) return;
    if (p.pageView === 'continuous') paginateContinuousSheets();
    else if (p.pageView !== 'infinite') paginateActiveSheet();
  }, 180);
}

function scheduleFactCheck() {
  return;
}

async function runFactCheck() {
  const p = activePage();
  if (!requireLogin('Opret en profil for at bruge forståelsestjek.')) return;
  if (!hasPremium() && usageRecord().understanding >= 10) {
    openPremiumDialog();
    return;
  }
  const text = ($('#editor')?.innerText || '').trim();
  if (text.length < 30) {
    alert('Skriv lidt mere tekst, før du tjekker din forståelse.');
    return;
  }
  const cfg = docTypes[p.docType] || docTypes.general;
  const status = $('#saveState');
  if (status) status.textContent = 'Ser på forståelsen...';
  try {
    const instr = `Giv forsigtig læringsfeedback til en universitetsstuderende i ${pageDocTypeLabel(page)}. Du er ikke facit. Peg på højst tre steder, der kan være uklare eller mangle et perspektiv. Brug formuleringer som "kan være uklart" og bed brugeren sammenligne med sin pensumkilde. Returnér kort, struktureret tekst uden karakter eller sikker konklusion.`;
    const answer = await callAI(instr, text);
    p.comments = p.comments || [];
    p.comments.push({
      type: 'Tjek min forståelse',
      from: 1,
      to: Math.max(1, text.split('\n').length),
      text: `${answer}\n\nDette afsnit kan være uklart eller mangle følgende perspektiv. Sammenlign med din pensumkilde.`,
      replacement: '',
    });
    updateCurrentAccount(account => {
      account.usage ||= { pdf: 0, understanding: 0 };
      account.usage.understanding = Number(account.usage.understanding || 0) + 1;
    });
    persist();
    renderWorkspace();
  } catch (err) {
    alert(err.message || 'Forståelsestjekket kunne ikke gennemføres.');
  }
  if (status) status.innerHTML = '<span class="save-dot"></span> Gemt';
}

function localFactCheck(text, docType) {
  const issues = [];
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (/=\s*[^0-9\s]/.test(line) && !/[+\-*/^]/.test(line) && docType === 'mathematics') {
      issues.push({ line: i + 1, problem: 'Formlen ser ufuldstændig ud.', suggestion: 'Tjek om alle led og operatorer er med.' });
    }
    if (/\d+\s*[a-zA-Z]/.test(line) && !/\d+\s*(m|kg|s|A|V|J|N|W|mol|Hz|Pa)/.test(line) && (docType === 'physics' || docType === 'engineering')) {
      issues.push({ line: i + 1, problem: 'Manglende eller uklar enhed.', suggestion: 'Tilføj SI-enhed (fx m, kg, V).' });
    }
  });
  return { issues: issues.slice(0, 3) };
}

function captureEditorRange() {
  const sel = window.getSelection();
  const ed = $('#editor');
  if (sel?.rangeCount && ed?.contains(sel.anchorNode)) {
    editorRange = sel.getRangeAt(0).cloneRange();
  }
}

function insertHtml(html) {
  const ed = $('#editor');
  if (!ed) return;
  ed.focus();
  const sel = window.getSelection();
  let rangeOk = false;
  if (editorRange) {
    try {
      if (ed.contains(editorRange.startContainer)) {
        sel.removeAllRanges();
        sel.addRange(editorRange);
        rangeOk = true;
      }
    } catch { rangeOk = false; }
  }
  if (!rangeOk) {
    const r = document.createRange();
    r.selectNodeContents(ed);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  document.execCommand('insertHTML', false, html);
  ed.dispatchEvent(new Event('input'));
}

let noteDictation = { recognition: null, listening: false };

function speechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function dictationLanguage() {
  const lang = noteLang() || appSettings.defaultLanguage || 'da';
  const map = { da: 'da-DK', en: 'en-US', sv: 'sv-SE', no: 'nb-NO', nb: 'nb-NO', fr: 'fr-FR', es: 'es-ES', de: 'de-DE' };
  return map[lang] || lang;
}

function isDictationSecureContext() {
  return window.isSecureContext || location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
}

function ensureDictationStatus() {
  let status = $('#noteDictationStatus');
  if (status) return status;
  status = document.createElement('div');
  status.id = 'noteDictationStatus';
  status.className = 'note-dictation-status';
  status.innerHTML = '<div><b>Stemme til noter</b><span id="noteDictationText">Klar</span></div><button type="button" data-dictation-stop>Stop</button>';
  status.addEventListener('click', event => {
    if (event.target.closest('[data-dictation-stop]')) stopDictationToNotes();
  });
  document.body.appendChild(status);
  return status;
}

function updateDictationStatus(text, listening = false) {
  const status = ensureDictationStatus();
  status.classList.toggle('listening', listening);
  const label = $('#noteDictationText');
  if (label) label.textContent = text;
}

function insertDictatedText(text) {
  const clean = String(text || '').trim();
  if (!clean) return;
  insertHtml(`${escapeHtml(clean)} `);
  captureEditorRange();
}

async function ensureMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
    const missing = error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError';
    updateDictationStatus(denied
      ? 'Mikrofonadgang blev afvist. Tillad mikrofon i browseren eller macOS-indstillinger.'
      : missing
        ? 'Der blev ikke fundet en mikrofon.'
        : 'Mikrofonen kunne ikke startes. Tjek browserens tilladelser.', false);
    return false;
  }
}

function dictationErrorMessage(error) {
  const messages = {
    'not-allowed': 'Mikrofonadgang blev afvist. Tillad mikrofon i browseren eller macOS-indstillinger.',
    'service-not-allowed': 'Talegenkendelse er ikke tilladt i denne browser.',
    'audio-capture': 'Der blev ikke fundet en aktiv mikrofon.',
    'no-speech': 'Jeg hørte ikke noget. Prøv igen tættere på mikrofonen.',
    network: 'Talegenkendelse kræver netværksadgang i denne browser.',
    aborted: 'Diktering blev stoppet.',
  };
  return messages[error] || `Diktering stoppede: ${error || 'ukendt fejl'}.`;
}

async function startDictationToNotes() {
  if (!requireLogin('Stemme til noter kræver en profil.')) return;
  if (!activePage() || !$('#editor')) return alert('Åbn eller opret en note først.');
  if (!isDictationSecureContext()) {
    updateDictationStatus('Åbn appen via HTTPS, localhost eller desktop-appen for at bruge mikrofon.', false);
    return;
  }
  const Recognition = speechRecognitionConstructor();
  if (!Recognition) {
    updateDictationStatus('Denne browser understøtter ikke tale-til-tekst direkte. Brug Chrome, Edge eller Safari.', false);
    return;
  }
  if (noteDictation.listening) return stopDictationToNotes();
  updateDictationStatus('Klargør mikrofon...', false);
  if (!(await ensureMicrophonePermission())) return;
  captureEditorRange();
  const recognition = new Recognition();
  noteDictation = { recognition, listening: false };
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.lang = dictationLanguage();
  recognition.onstart = () => {
    noteDictation.listening = true;
    updateDictationStatus(`Lytter på ${recognition.lang}...`, true);
  };
  recognition.onresult = event => {
    let finalText = '';
    let interimText = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0]?.transcript || '';
      if (event.results[index].isFinal) finalText += transcript;
      else interimText += transcript;
    }
    if (finalText.trim()) insertDictatedText(finalText);
    updateDictationStatus(interimText.trim() ? `Hører: ${interimText.trim()}` : 'Lytter...', true);
  };
  recognition.onerror = event => {
    updateDictationStatus(dictationErrorMessage(event.error), false);
    noteDictation.listening = false;
  };
  recognition.onend = () => {
    noteDictation.listening = false;
    updateDictationStatus('Diktering stoppet.', false);
  };
  try {
    recognition.start();
  } catch {
    updateDictationStatus('Diktering er allerede i gang.', true);
  }
}

function stopDictationToNotes() {
  if (noteDictation.recognition) {
    try { noteDictation.recognition.stop(); } catch {}
  }
  noteDictation.listening = false;
  updateDictationStatus('Diktering stoppet.', false);
}

function insertPdfHtmlIntoActivePaper(html) {
  const page = activePage();
  if (!page) return false;
  ensurePageSheets(page);
  const sheetIndex = page.currentSheet;
  const editor = $('#editor');
  const currentHtml = editor?.innerHTML ?? page.sheets[sheetIndex] ?? '<p><br></p>';
  page.sheets[sheetIndex] = `${currentHtml}${html}`;
  page.html = page.sheets.join('<div class="page-break"></div>');
  page.updated = new Date().toISOString();
  persist();
  renderWorkspace();
  requestAnimationFrame(() => {
    const visibleEditor = $('#editor');
    if (!visibleEditor) return;
    paginateActiveSheet();
    requestAnimationFrame(() => {
      const activeEditor = $('#editor');
      if (!activeEditor) return;
      activeEditor.scrollIntoView({ block: 'center', behavior: 'smooth' });
      activeEditor.focus();
      captureEditorRange();
    });
  });
  return true;
}

function applySelectionStyle(prop, val) {
  const sel = window.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style[prop] = val;
  try { range.surroundContents(span); }
  catch { const f = range.extractContents(); span.appendChild(f); range.insertNode(span); }
  (focusedEditor() || $('#editor'))?.dispatchEvent(new Event('input'));
}

function noteLines() {
  return editorDocumentText().split('\n').map(l => l.trimEnd());
}

const studyHelpPrompts = {
  explain: 'Forklar teksten på meget enkelt dansk, som til en begynder, men bevar det faglige niveau. Du må ikke blot gengive teksten. Start med hovedideen i almindelige ord, forklar fagord ét ad gangen, brug en hverdagsanalogi, giv et konkret eksempel trin for trin, og afslut med en kort huskeregel.',
  proofread: 'Ret stavning, grammatik, tegnsætning og uklare formuleringer. Bevar betydning, fagbegreber og kilder. Returnér kun den komplette rettede tekst, så den kan erstatte originalen direkte.',
  summarize: 'Lav et præcist overblik med hovedidé, nøglebegreber, sammenhænge og det vigtigste eksempel.',
  questions: 'Lav 4 varierede eksamensspørgsmål, der tester forklaring, anvendelse, sammenligning og kritisk vurdering. Tilføj et kort hint til hvert spørgsmål.',
  understood: 'Lav et forståelsestjek med ét spørgsmål, et hint, et konkret eksempel og et kort facit.',
  derive: 'Gennemgå udledningen trin for trin. Forklar hvorfor hvert trin er lovligt, og kontrollér enheder og antagelser.',
  debug: 'Find konkrete fejl eller svage punkter. Vis først problemet, derefter en rettet løsning og til sidst hvorfor rettelsen virker.',
  units: 'Kontrollér alle enheder og dimensioner trin for trin. Vis afvigelser og en korrigeret version.',
};

const studyHelpLabels = {
  explain: 'Forklaring', proofread: 'Rettelse', summarize: 'Resumé', questions: 'Eksamen',
  understood: 'Forståelsestjek', derive: 'Udledning', debug: 'Fejlfinding', units: 'Enheder',
};

async function runQuickStudyHelp(action = 'explain') {
  const page = activePage();
  if (!page) return alert('Åbn et dokument først.');
  if (!requireStudyHelp()) return;
  const selected = window.getSelection()?.toString().trim();
  const source = selected || editorDocumentText();
  if (!source) return alert('Skriv lidt i noten først, eller markér tekst du vil have hjælp til.');
  showEditorAiLoading('Studiehjælp arbejder…');
  try {
    const answer = await callAI(studyHelpPrompts[action] || studyHelpPrompts.explain, source, {
      action,
      context: currentStudyContext({ source: selected ? 'markering' : 'hele noten' }),
    });
    if (action === 'proofread' && selected) {
      const selection = window.getSelection();
      if (selection?.rangeCount && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(answer));
        primaryEditor()?.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      page.comments = page.comments || [];
      page.comments.push({
        type: studyHelpLabels[action] || 'Studiehjælp',
        from: selected ? 'markering' : 1,
        to: selected ? 'markering' : noteLines().length,
        text: answer,
        replacement: action === 'proofread' ? answer : '',
        history: [
          { role: 'user', content: source.slice(0, 4000) },
          { role: 'assistant', content: answer },
        ],
      });
      persist();
      renderWorkspace();
    }
  } catch (error) {
    alert(error.message || 'Studiehjælp kunne ikke hentes lige nu.');
  } finally {
    hideEditorAiLoading();
  }
}

function hideSelectionHelper() {
  $('#selectionHelper')?.classList.remove('visible', 'working');
}

function showSelectionHelper() {
  const sel = window.getSelection();
  const editors = pageEditorNodes();
  const helper = $('#selectionHelper');
  if (!helper || !editors.length || !sel?.rangeCount || sel.isCollapsed) {
    hideSelectionHelper();
    return;
  }
  const anchorInEditor = editors.some(ed => ed.contains(sel.anchorNode));
  if (!anchorInEditor) return hideSelectionHelper();
  const range = sel.getRangeAt(0);
  const text = sel.toString().trim();
  if (!text) return hideSelectionHelper();
  helperRange = range.cloneRange();
  helperText = text;
  const rect = range.getBoundingClientRect();
  helper.classList.add('visible');
  helper.style.left = `${Math.max(12, Math.min(window.innerWidth - helper.offsetWidth - 12, rect.left + rect.width / 2 - helper.offsetWidth / 2))}px`;
  helper.style.top = `${Math.max(58, rect.top - 52)}px`;
}

async function runSelectionAction(action) {
  if (!helperText || !helperRange) return;
  if (!requireStudyHelp()) return;
  const helper = $('#selectionHelper');
  if (action === 'flash') {
    editorRange = helperRange.cloneRange();
    insertHtml(`<div class="study-card"><strong>Flashcard</strong><b>Spørgsmål:</b> Forklar dette med egne ord.<br><br><b>Svar:</b> ${escapeHtml(helperText)}</div><p><br></p>`);
    return hideSelectionHelper();
  }
  helper?.classList.add('working');
  const prompts = {
    explain: studyHelpPrompts.explain,
    summarize: studyHelpPrompts.summarize,
    questions: studyHelpPrompts.questions,
    proofread: studyHelpPrompts.proofread,
    understood: studyHelpPrompts.understood,
  };
  try {
    const answer = await callAI(prompts[action], helperText, {
      action,
      context: currentStudyContext({ source: 'markeret tekst' }),
    });
    if (action === 'proofread') {
      helperRange.deleteContents();
      helperRange.insertNode(document.createTextNode(answer));
      $('#editor')?.dispatchEvent(new Event('input'));
    } else {
      const page = activePage();
      if (page) {
        page.comments = page.comments || [];
        page.comments.push({
          type: action === 'understood' ? 'Forståelsestjek' : 'Studiehjælp',
          from: 'markering',
          to: '',
          text: answer,
          replacement: '',
          history: [
            { role: 'user', content: helperText },
            { role: 'assistant', content: answer },
          ],
        });
        persist();
        renderWorkspace();
      }
    }
  } catch (error) {
    alert(error.message);
  }
  hideSelectionHelper();
}

let autoScriptLock = false;

function openStudyDialog(action) {
  if (!activePage()) { alert('Åbn et dokument først.'); return; }
  if (!requireStudyHelp()) return;
  const lines = noteLines();
  $('#linePreview').textContent = lines.map((l, i) => `${i + 1}  ${l}`).join('\n');
  $('#lineFrom').value = 1;
  $('#lineTo').value = Math.max(1, lines.length);
  $('#lineFrom').max = lines.length;
  $('#lineTo').max = lines.length;
  if ($('#aiAction')) $('#aiAction').value = action;
  $('#noteAiResult').className = 'ai-result';
  $('#aiDialog').showModal();
}

function autoScriptInTextNode(node, offset) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;
  if (node.parentElement?.closest('sup, sub')) return false;
  const text = node.textContent;
  const before = text.slice(0, offset);
  const sup = before.match(/([0-9a-zA-Zα-ωπ]+)\^([0-9a-zA-Z+-]+)$/);
  const sub = before.match(/([0-9a-zA-Zα-ωπ]+)_([0-9a-zA-Z+-]+)$/);
  const m = sup || sub;
  if (!m) return false;

  autoScriptLock = true;
  const start = offset - m[0].length;
  const base = m[1], script = m[2];
  const beforeText = text.slice(0, start);
  const afterText = text.slice(offset);
  const parent = node.parentNode;
  const tag = sup ? 'sup' : 'sub';
  const frag = document.createDocumentFragment();
  if (beforeText) frag.appendChild(document.createTextNode(beforeText));
  frag.appendChild(document.createTextNode(base));
  const el = document.createElement(tag);
  el.textContent = script;
  frag.appendChild(el);
  if (afterText) frag.appendChild(document.createTextNode(afterText));
  parent.replaceChild(frag, node);

  const sel = window.getSelection();
  const range = document.createRange();
  range.setStartAfter(el);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  autoScriptLock = false;
  return true;
}

function autoScriptOnInput(ed) {
  if (autoScriptLock) return;
  const sel = window.getSelection();
  if (!sel?.rangeCount || !ed.contains(sel.anchorNode)) return;
  let node = sel.anchorNode;
  let offset = sel.anchorOffset;
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.childNodes[offset - 1]?.nodeType === Node.TEXT_NODE) {
      node = node.childNodes[offset - 1];
      offset = node.textContent.length;
    } else return;
  }
  if (autoScriptInTextNode(node, offset)) ed.dispatchEvent(new Event('input'));
}

function bindEditor() {
  renderMathInEditor();
  pageEditorNodes().forEach(editor => applyProofreadUnderlines(editor));
  const page = activePage();
  const restore = page?.pageView === 'continuous'
    ? document.querySelector(`[data-sheet-editor="${lastContinuousEditorSheet}"]`) || primaryEditor()
    : primaryEditor();
  setTimeout(() => restore?.focus(), 50);
}

const localCorrections = {
  da: { jegg:'jeg', hvsi:'hvis', hvislken:'hvilken', hvile:'hvilke', mna:'man', ma:'man', ska:'skal', skasl:'skal', ligsom:'ligesom', ngoet:'noget', dne:'den', dett:'dette', retskrnving:'retskrivning', indsdætte:'indsætte', molykoler:'molekyler', igeniør:'ingeniør', teksniek:'teknik', oraniseret:'organiseret', ntoer:'noter', nrå:'når', vjag:'jeg', vjeg:'jeg', ijeg:'jeg' },
  en: { teh:'the', recieve:'receive', adress:'address', seperate:'separate', definately:'definitely', occured:'occurred', wich:'which', becuase:'because', thier:'their' },
  de: { vieleicht:'vielleicht', nähmlich:'nämlich', standart:'Standard', seperat:'separat' },
  fr: { acceuil:'accueil', language:'langage', apareil:'appareil' },
  es: { tambien:'también', facil:'fácil', informacion:'información' },
};

function correctWordBeforeCaret(editor) {
  if (!appSettings.autoCorrect || activePage()?.autoCorrect === false) return false;
  const selection = window.getSelection();
  if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return false;
  let node = selection.anchorNode;
  let offset = selection.anchorOffset;
  if (node?.nodeType !== Node.TEXT_NODE) return false;
  const before = node.textContent.slice(0, offset);
  const match = before.match(/([\p{L}''-]+)$/u);
  if (!match) return false;
  const original = match[1];
  const lang = activePage()?.language || appSettings.defaultLanguage || 'da';
  const replacement = localCorrections[lang]?.[original.toLowerCase()];
  if (!replacement || replacement.toLowerCase() === original.toLowerCase()) return false;
  const corrected = /^[A-ZÆØÅ]/.test(original) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
  const start = offset - original.length;
  node.textContent = node.textContent.slice(0, start) + corrected + node.textContent.slice(offset);
  const range = document.createRange();
  range.setStart(node, start + corrected.length);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function buildSpellSet(text) {
  return new Set(text.toLowerCase().split(/\s+/).filter(Boolean));
}

const PROOFREAD_SKIP_SELECTOR = '.proofread-mark,.spell-error,.comma-error,.fact-error,.math-render,.embedded-model,.music-staff-insert,.code-block,.sticky-note,pre,code,.pdf-page';
const MARK_PRIORITY = { spell: 3, comma: 2, fact: 1 };

function unwrapProofreadMarks(root) {
  if (!root) return;
  root.querySelectorAll('.proofread-mark, .spell-error, .comma-error, .fact-error').forEach(span => {
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
  root.normalize();
}

function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function mergeProofreadMarks(marks) {
  const sorted = [...marks].sort((a, b) => a.start - b.start || (MARK_PRIORITY[b.type] - MARK_PRIORITY[a.type]));
  const kept = [];
  sorted.forEach(mark => {
    const conflict = kept.find(k => rangesOverlap(k, mark));
    if (!conflict) {
      kept.push(mark);
      return;
    }
    if (MARK_PRIORITY[mark.type] > MARK_PRIORITY[conflict.type]) {
      kept[kept.indexOf(conflict)] = mark;
    }
  });
  return kept.sort((a, b) => a.start - b.start);
}

function collectCommaMarks(text, lang) {
  const marks = [];
  if (lang !== 'da') {
    [[/\s+,/g, 'Mellemrum før komma'], [/,{2,}/g, 'Dobbelt komma'], [/,(?=[\p{L}])/gu, 'Manglende mellemrum efter komma']].forEach(([pattern, hint]) => {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        marks.push({ start: match.index, end: match.index + match[0].length, type: 'comma', hint, raw: match[0] });
      }
    });
    return marks;
  }
  const rules = [
    [/\s+,/g, 'Mellemrum før komma'],
    [/,{2,}/g, 'Dobbelt komma'],
    [/,(?=[\p{L}æøåÆØÅ])/gu, 'Manglende mellemrum efter komma'],
    [/\bmen\s+,/gi, 'Unødvendigt komma efter “men”'],
    [/\bog\s+,/gi, 'Unødvendigt komma før “og”'],
  ];
  rules.forEach(([pattern, hint]) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      marks.push({ start: match.index, end: match.index + match[0].length, type: 'comma', hint, raw: match[0] });
    }
  });
  return marks;
}

function collectFactMarks(text) {
  const marks = [];
  const patterns = [
    [/\b(?:altid|aldrig|beviser|bevise|umuligt|alle|ingen|enhver)\b[^.!?]{6,100}[.!?]?/gi, 'Kategorisk påstand'],
    [/\b\d+(?:[.,]\d+)?\s*(?:%|procent)\b[^.!?]{0,80}[.!?]?/gi, 'Præcis tal eller procent'],
    [/\b(?:det er fakta|helt sikkert|alle ved at|ingen tvivl)\b[^.!?]{0,80}[.!?]?/gi, 'Uunderbygget sikkerhed'],
  ];
  patterns.forEach(([pattern, hint]) => {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const excerpt = match[0].trim();
      if (excerpt.length < 12) continue;
      marks.push({ start: match.index, end: match.index + match[0].length, type: 'fact', hint, raw: excerpt });
    }
  });
  return marks;
}

function collectSpellMarks(text, lang) {
  const marks = [];
  const re = /[\p{L}][\p{L}'-]*/gu;
  let match;
  while ((match = re.exec(text)) !== null) {
    const word = match[0];
    if (isWordCorrect(word, lang)) continue;
    marks.push({ start: match.index, end: match.index + word.length, type: 'spell', raw: word });
  }
  return marks;
}

function commaSuggestions(fragment) {
  if (/\s+,/.test(fragment)) return [fragment.replace(/\s+,/g, ',')];
  if (/,{2,}/.test(fragment)) return [fragment.replace(/,+/g, ',')];
  if (/,(?=[\p{L}])/u.test(fragment)) return [fragment.replace(/,(?=[\p{L}])/u, ', ')];
  if (/\bmen\s+,/i.test(fragment)) return [fragment.replace(/\s+,/g, '')];
  if (/\bog\s+,/i.test(fragment)) return [fragment.replace(/,\s*$/g, '')];
  return [];
}

function decorateTextNodeForProofread(node, lang) {
  const text = node.textContent;
  const marks = mergeProofreadMarks([
    ...collectSpellMarks(text, lang),
    ...collectCommaMarks(text, lang),
    ...collectFactMarks(text),
  ]);
  if (!marks.length) return;
  const frag = document.createDocumentFragment();
  let pos = 0;
  marks.forEach(mark => {
    if (mark.start > pos) frag.appendChild(document.createTextNode(text.slice(pos, mark.start)));
    const span = document.createElement('span');
    span.className = `proofread-mark ${mark.type}-error`;
    span.setAttribute('spellcheck', 'false');
    span.dataset.proofreadId = uid();
    span.dataset.proofreadType = mark.type;
    if (mark.hint) span.dataset.proofreadHint = mark.hint;
    if (mark.type === 'fact') span.dataset.factText = mark.raw;
    span.textContent = text.slice(mark.start, mark.end);
    frag.appendChild(span);
    pos = mark.end;
  });
  if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
  node.parentNode.replaceChild(frag, node);
}

function applyProofreadUnderlines(editor) {
  const page = activePage();
  if (!editor || !page || page.proofreading === false) {
    if (editor) unwrapProofreadMarks(editor);
    return;
  }
  const lang = page.language || appSettings.defaultLanguage || 'da';
  const selection = window.getSelection();
  const saved = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  unwrapProofreadMarks(editor);
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest(PROOFREAD_SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => decorateTextNodeForProofread(node, lang));
  editor.normalize();
  if (saved && editor.contains(saved.startContainer)) {
    try {
      selection.removeAllRanges();
      selection.addRange(saved);
    } catch {}
  }
}

function findProofreadMark(id) {
  return document.querySelector(`[data-proofread-id="${id}"]`);
}

function replaceProofreadMark(markId, replacement) {
  const span = typeof markId === 'string' ? findProofreadMark(markId) : markId;
  if (!span?.isConnected || !span.parentNode) return;
  const text = document.createTextNode(replacement);
  span.parentNode.replaceChild(text, span);
  const editor = $('#editor');
  if (editor) {
    editor.normalize();
    syncEditorToPage(editor, activePage());
    scheduleProofreadRefresh();
  }
}

let proofreadRefreshTimer;
function scheduleProofreadRefresh() {
  clearTimeout(proofreadRefreshTimer);
  proofreadRefreshTimer = setTimeout(() => {
    const editor = $('#editor');
    if (editor) applyProofreadUnderlines(editor);
  }, 80);
}
const spellDictionaries = {
  da: buildSpellSet(`og i jeg det at en et den til er som på de med var han for ikke der så har men om vi min noget ham hun sig din dit dine deres vores jeres mit mine hans hendes skal kan vil må blive blev blevet være været have haft gøre gjort gå gik gået se kom kommer kommet tage tager taget give giver givet få får fået vide ved kender kendt tro tror troede mene mener mente synes syntes tænke tænker tænkte føle føler følte leve lever levede arbejde arbejder arbejdede studere studerer studerede lære lærer lærte læse læser læste skrive skriver skrev skrevet tale taler talte høre hører hørte spørge spørger spurgte svare svarer svarede forklare forklarer forklarede forstå forstår forstod huske husker huskede glemme glemmer glemte hjælpe hjælper hjalp prøve prøver prøvede begynde begynder begyndte slutte slutter sluttede fortsætte fortsætter fortsatte ændre ændrer ændrede bruge bruger brugte finde finder fandt søge søger søgte vise viser viste betyde betyder betød god godt gode hvorfor hvordan hvad hvem hvor når også meget lidt alt alle ingen nogen denne dette disse sådan bare lige stadig altid aldrig måske virkelig faktisk derfor derudover desuden imidlertid dog endnu allerede snart gerne kunne skulle ville måtte burde mens imens efter før under over mellem uden inden igennem gennem hele helt næsten cirka ligesom sandsynligvis muligvis tydeligt klart mere mindre bedre værre stor stort store lille små ny nyt nye gammel gammelt gamle ung ungt unge lang langt lange kort korte høj højt høje lav lavt lave rigtig rigtigt forkert sand falsk ægte nem nemt svær svært let vigtig vigtigt vigtige interessant kedelig normal særlig særligt almindelig mulig muligt umulig nødvendig relevant irrelevant aktuel tidligere senere nuværende fremtid fortid nutid i dag i morgen i går idag imorgen igår sagde siger sagt gjorde gøre laver lavet kommer går gik skal skulle vil ville kan kunne må måtte bliver blev være været havde har havde var er var blev bliver ligesom sammen hver hverdag hverdagen weekend weekender ferie ferier pause pauser stop stopper stopper start starter starter åbner åbne lukker lukke lukket åbent lukket ind ad ud op ned hjem hjemme ude inde her der hvorhen hvorhenne hvorfra hvorledes hvorfor hvordan hvadend hvis selvom selv skønt fordi da når mens indtil medmindre uden at og eller men dog alligevel desuagtet imod imod for imod mod gennem langs rundt omkring omkring ved siden af tæt på langt fra nær fjern nærme fjerne tæt tætte tættere fjernere væsentlig vigtig vigtigt central centrale grundlæggende teoretisk teori teorier begreb begreber model modeller analyse analyser metode metoder data resultat resultater konklusion konklusioner diskussion diskussioner introduktion baggrund problem problemstilling forskning forskningsfelt forskningsdesign undersøgelse undersøgelser eksperiment eksperimenter hypotese hypoteser variabel variable uafhængig afhængig kontrolgruppe stikprøve population validitet reliabilitet etik samtykke anonymisering kvalitativ kvantitativ empirisk empiriske observation observationer interview interviews spørgeskema spørgeskemaer litteratur litteraturreview kilde kilder citat citater reference referencer bibliografi pensum pensumliste eksamen eksamensopgave opgave opgaver note noter notat notater fag faget faglig faglige universitet universitetet studie studerende undervisning forelæsning forelæsninger seminar seminare øvelse øvelser projekt projekter rapport rapporter artikel artikler bog bøger kapitel kapitler afsnit paragraf paragraffer sætning sætninger ord tekst tekster stavning grammatik korrektur rettelse rettelser fejl fejlen fejlene stavefejl grammatikfejl tegnsætning komma punktum spørgsmålstegn udråbstegn anførselstegn bindestreg streg kolon semikolon parentes parenteser tal talord procent procenter år måned måneder uge uger dag dage time timer minut minutter sekund sekunder mandag tirsdag onsdag torsdag fredag lørdag søndag januar februar marts april maj juni juli august september oktober november december danmark dansk danske engelsk engelske tysk tyske fransk franske spansk spanske svensk svenske norsk norske matematik matematisk matematiske fysik fysisk fysiske kemi kemisk kemiske biologi biologisk biologiske medicin medicinsk medicinske sundhed psykologi psykologisk psykologiske samfund samfundsvidenskab økonomi økonomisk økonomiske jura juridisk juridiske historie historisk historiske humaniora humanistisk humanistiske sprog sproglig sproglige musik musikalsk musikalske teknik teknisk tekniske ingeniør ingeniører ingeniørvidenskab algoritme algoritmer programmering programmeringskode kode koder software hardware database databaser netværk server klient internet digital digitalt digitale analog analogt analoge elektrisk elektriske elektronik elektronisk elektroniske mekanisk mekaniske statisk dynamisk dynamiske energi kraft kræfter masse acceleration hastighed bevægelse rotation vibration temperatur tryk volumen densitet elektricitet magnetisme lys lyd bølge bølger frekvens amplitude spænding strøm modstand kapacitet induktans transistor diode kredsløb sensor sensorer aktuator aktuatorer robot robotter automatisering perception planlægning feedback kontrol styring system systemer proces processer funktion funktioner struktur strukturer komponent komponenter parameter parametre konstant konstanter ligning ligninger formel formler integral derivat afledt afledte grænseværdi grænseværdier vektor vektorer matrix matricer determinant determinanter egenvektor egenvektorer egenvalue egenvalues sandsynlighed statistik statistisk statistiske middelværdi median varians standardafvigelse korrelation regression normalfordeling binomialfordeling stokastisk stokastiske diskret kontinuerlig kontinuerlige topologi geometri algebra analyse calculus kompleks komplekse differentialligning differentialligninger numerisk numeriske optimering optimeringsproblem laboratorium laboratoriejournal forsøg forsøgsrapport molekyl molekyler atom atomer ion ioner reaktion reaktioner stof stoffer opløsning opløsninger koncentration ph syre baser katalysator enzym enzymer celle celler væv organ organer dna rna protein proteiner gen gener evolution mutation selektion økosystem økosystemer art arter populationer habitat biodiversitet klima miljø bæredygtighed patient patienter diagnose diagnoser symptom symptomer behandling behandlinger terapi terapier medicin medicinering dosering bivirkning bivirkninger farmakologi epidemiologi infektion infektioner virus bakterie bakterier vaccine vacciner immunitet inflammation tumor cancer hjerte lunger lever nyre nyrer hjerne nervesystem hormon hormoner stofskifte metabolisme psykisk psykiske adfærd adfærds kognition kognitiv kognitive opmærksomhed hukommelse læring motivation emotion emotioner stress angst depression personlighed intelligens udvikling barndom ungdom voksen alderdom neuro neurovidenskab hjernebark frontallap hippocampus amygdala synapse synapser neuron neuroner signal signaler stimulus stimuli respons responsen samfund samfundsmæssig samfundsmæssige kultur kulturel kulturelle identitet identiteter norm normer værdi værdier institution institutioner politik politisk politiske demokrati demokratisk demokratiske magt magtforhold ulighed social socialt sociale klasse klasser etnicitet køn generation generationer urbanisering migration globalisering økonomisk økonomiske marked markeder udbud efterspørgsel pris priser omkostning omkostninger profit investering investeringer finans finansiel finansielle bank banker rente renter inflation vækst recession arbejdsmarked løn beskæftigelse arbejdsløshed skat skatter budget regnskab balance aktiv passiv likviditet likviditetsgrad soliditet nøgletal økonometri prognose prognoser risiko risici usikkerhed scenarie scenarier strategi strategier konkurrence konkurrencedygtighed innovation entreprenørskab virksomhed virksomheder organisation organisationer ledelse leder ledere medarbejder medarbejdere team teams projektledelse kommunikation forhandling konflikt konflikter samarbejde partnerskab partnerskaber kontrakt kontrakter aftale aftaler misligholdelse erstatning ansvar ansvarlig ansvarlige compliance regulering reguleringer lov lovgivning lovgivningen paragraf paragraffer paragrafen paragrafferne bestemmelse bestemmelser dom domme retspraksis præjudikat præjudikater retskilde retskilder fortolkning anvendelse sanktion sanktioner straf civil civilret strafferet forvaltningsret international internationalt internationale menneskeret menneskerettigheder emrk eu eu-ret direktiv forordning jurisdiktion kompetence procedure procedurer bevis beviser bevisbyrde faktum faktiske retlig retlige spørgsmål problemformulering argument argumentation modargument modargumenter præmis præmisser logik bevisførelse deduktion induktion abduktion sandhed gyldighed konsistens inkonsistens definition definitioner eksempel eksempler illustration illustrationer sammenligning sammenligninger forskel forskelle lighed ligheder sammenhæng sammenhænge årsag årsager virkning virkninger konsekvens konsekvenser implikation implikationer hypotese test teste testet verificere verificerer verificeret falsificere falsificerer falsificeret reproducere reproducerer reproduceret generalisere generaliserer generaliseret afgrænse afgrænser afgrænset operationalisere operationaliserer operationaliseret måle måler målte måling målinger skala skalaer bias biaset biaser confounding triangulering mixed mixed-methods kvalitativt kvantitativt narrativ narrativt narrativer diskurs diskurser hermeneutik fortolkning fortolkninger tekstanalyse nærlæsning kontekst kontekster forfatter forfattere målgruppe tendens tendenser troværdighed arkiv arkiver dokument dokumenter primærkilde sekundærkilde sekundærkilder oversættelse oversættelser grammatikanalyse ordforråd fonetik fonologi morfologi syntaks semantik pragmatik korpus kollokation kollokationer sprogbrug dialekt dialekter accent accenter udtale retskrivning stavekontrol korrekturlæsning node noder nodelinje nodelinjer takt takter taktart taktarter toneart tonearter dur mol akkord akkorder harmoni harmonisk harmoniske rytme rytmisk rytmiske melodi melodier kontrapunkt instrumentation orkestrering komposition komponist komponister værk værker symfoni sonate kantate opera koral improvisation øvelsesplan øveskema hørelære interval intervaller kadence kadencer stemmeføring form formanalyse exposition development recapitulation tema temaer variation variationer dynamik artikulation artikulationer forte piano crescendo diminuendo legato staccato`),
  en: buildSpellSet(`the and to of a in is it you that he was for on are as with his they at be this from I have or by one had not but what all were when we there can an your which their said if do will each about how up out many then them these so some her would make like into him time has two more very after words long than first been call who its now find day did get come made may part over new sound take only little work know place year live me back give most very after thing our just name good sentence man think say great where help through much before line right too means old any same tell boy follow came want show also around form three small set put end does another well large must big even such because turn here why ask went men read need land different home us move try kind hand picture again change off play spell air away animal house point page letter mother answer found study still learn should America world high every near add food between own below country plant last school father keep tree never start city earth eye light thought head under story saw left don't few while along might close something seem next hard open example begin life always those both paper together got group often run important until children side feet car mile night walk white sea began grow took river four carry state once book hear stop without second later miss idea enough eat face watch far Indian really almost let above girl sometimes mountain cut young talk soon list song leave family it's body music color stand sun questions fish area mark dog horse birds problem complete room knew since ever piece told usually didn't friends easy heard order red door sure become top ship across today during short better best however low hours black products happened whole measure remember early waves reached listen wind rock space covered fast several hold himself toward five step morning passed vowel true hundred against pattern numeral table north slowly money map farm pulled draw voice seen cold cried plan notice south sing war ground fall king town I'll unit figure certain field travel wood fire upon done English road half ten fly gave box finally wait correct oh quickly person became shown minutes strong verb stars front feel fact inches street decided contain course surface produce building ocean class note nothing rest carefully scientists inside wheels stay green known island week less machine base ago stood plane system behind ran round boat game force brought understand warm common bring explain dry though language shape deep thousands yes clear equation yet government filled heat full hot check object am action atoms human history effect electric expect crop modern element hit student corner party supply bone rail imagine provide agree thus capital won't chair dangerous fraction satellite available program interested level type favorite wonder damage practice separate universe please thick several dictionary section winter cotton written wild instrument kept final plane surface system behind ran round boat game force brought understand warm common receive paragraph syllable whether clothes flowers teacher held describe drive cross speak solve appear metal son either ice sleep village factors result jumped snow ride care floor hill pushed baby buy century outside everything tall already instead phrase soil bed copy free hope spring case laughed nation quite type themselves temperature bright lead everyone method section consonant within dictionary syllable several paragraph whether clothes flowers teacher held describe drive cross speak solve appear metal son either ice sleep village factors result jumped snow ride care floor hill pushed baby buy century outside everything tall already instead phrase soil bed copy free hope spring case laughed nation quite type themselves temperature bright lead everyone method section consonant within`),
};

function replaceSpellError(span, replacement) {
  replaceProofreadMark(span?.dataset?.proofreadId || span, replacement);
}

let spellContextMenu;

function hideSpellContextMenu() {
  spellContextMenu?.remove();
  spellContextMenu = null;
}

function showProofreadContextMenu(x, y, span, items, label = 'Forslag') {
  hideSpellContextMenu();
  if (!items.length) return;
  const menu = document.createElement('div');
  menu.className = 'spell-context-menu';
  menu.dataset.targetId = span.dataset.proofreadId;
  menu.innerHTML = `<span class="spell-context-label">${escapeHtml(label)}</span>${items.map(item => `
    <button type="button" class="${item.className || ''}" data-proofread-fix="${escapeHtml(item.value)}" ${item.action ? `data-proofread-action="${item.action}"` : ''}>${escapeHtml(item.label)}</button>`).join('')}`;
  document.body.appendChild(menu);
  spellContextMenu = menu;
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
  menu.querySelectorAll('[data-proofread-fix], [data-proofread-action]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      const target = findProofreadMark(menu.dataset.targetId);
      if (!target) return hideSpellContextMenu();
      if (btn.dataset.proofreadAction === 'explain-fact') {
        hideSpellContextMenu();
        explainFactMisunderstanding(target.dataset.factText || target.textContent, x, y);
        return;
      }
      replaceProofreadMark(menu.dataset.targetId, btn.dataset.proofreadFix);
      hideSpellContextMenu();
    });
  });
}

let factExplainPopover;

function hideFactExplainPopover() {
  factExplainPopover?.remove();
  factExplainPopover = null;
}

async function explainFactMisunderstanding(text, x, y) {
  if (!text?.trim()) return;
  if (!requireStudyHelp()) return;
  hideFactExplainPopover();
  const pop = document.createElement('div');
  pop.className = 'fact-explain-popover';
  pop.innerHTML = `<header><b>Mulig misforståelse</b><button type="button" data-close-fact-explain>×</button></header><div class="fact-explain-body"><div class="pdf-loading"><div class="pdf-pencil">${AI_PENCIL_SVG}</div><div class="pdf-loading-label">AI forklarer…</div></div></div>`;
  document.body.appendChild(pop);
  factExplainPopover = pop;
  pop.style.left = `${Math.max(12, Math.min(x, window.innerWidth - 360))}px`;
  pop.style.top = `${Math.max(12, Math.min(y, window.innerHeight - 220))}px`;
  pop.querySelector('[data-close-fact-explain]')?.addEventListener('click', hideFactExplainPopover);
  try {
    const answer = await callAI(
      'En studerende har skrevet en påstand der kan være faktuelt ukorrekt, for absolut formuleret eller misforstået. Forklar kort og venligt på dansk: (1) hvad der kan være misforstået, (2) hvilken nuance der mangler, (3) hvordan det kan formuleres mere præcist. Du er ikke facit — bed dem tjekke pensum. Maks 4 korte punkter.',
      text.trim(),
      { action: 'explain', context: currentStudyContext() },
    );
    pop.querySelector('.fact-explain-body').innerHTML = `<p>${escapeHtml(answer).replace(/\n/g, '</p><p>')}</p>`;
  } catch (error) {
    pop.querySelector('.fact-explain-body').innerHTML = `<p>${escapeHtml(error.message || 'Forklaringen kunne ikke hentes.')}</p>`;
  }
}

function openProofreadMenuForSpan(span, x, y) {
  const lang = activePage()?.language || appSettings.defaultLanguage || 'da';
  const type = span.dataset.proofreadType || (span.classList.contains('comma-error') ? 'comma' : span.classList.contains('fact-error') ? 'fact' : 'spell');
  if (type === 'comma') {
    const suggestions = commaSuggestions(span.textContent);
    if (!suggestions.length) return;
    showProofreadContextMenu(x, y, span, suggestions.map(value => ({ label: value, value })), 'Komma');
    return;
  }
  if (type === 'fact') {
    showProofreadContextMenu(x, y, span, [{ label: '💡 Forklar misforståelsen med AI', value: '', action: 'explain-fact', className: 'fact-explain-btn' }], 'Faktum');
    return;
  }
  const suggestions = spellSuggestions(span.textContent, lang);
  if (!suggestions.length) return;
  showProofreadContextMenu(x, y, span, suggestions.map(value => ({ label: value, value })), 'Stavning');
}

function scheduleAiAutoCorrect() {
  clearTimeout(proofreadingTimer);
  proofreadingTimer = setTimeout(() => {
    const editor = focusedEditor();
    if (editor) applyProofreadUnderlines(editor);
  }, 450);
}

function isWordCorrect(word, lang) {
  const lower = word.toLowerCase();
  if (!lower || /\d/.test(lower)) return true;
  if (lower.length <= 1 && !/^[ai]$/i.test(lower)) return true;
  if (/^[A-ZÆØÅ]{2,6}$/.test(word)) return true;
  if (hasBadCapitalization(word)) return false;
  const dict = spellDictionaries[lang] || spellDictionaries.da;
  if (dict.has(lower)) return true;
  if (localCorrections[lang]?.[lower]) return false;
  if (lang === 'da' && spellDictionaries.en?.has(lower)) return true;
  return false;
}

function hasBadCapitalization(word) {
  if (word.length < 2) return false;
  if (/^[A-ZÆØÅ][a-zæøåé]+$/u.test(word)) return false;
  if (/^[a-zæøåé]+$/u.test(word)) return false;
  if (/^[A-ZÆØÅ]{2,}$/u.test(word)) return false;
  return /[a-zæøå][A-ZÆØÅ]/.test(word);
}

function applyWordCase(corrected, original) {
  if (/^[A-ZÆØÅ]/.test(original)) return corrected.charAt(0).toLocaleUpperCase('da') + corrected.slice(1);
  return corrected;
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[rows - 1][cols - 1];
}

function spellSuggestions(word, lang = 'da') {
  const lower = word.toLowerCase();
  const suggestions = [];
  if (localCorrections[lang]?.[lower]) {
    suggestions.push(applyWordCase(localCorrections[lang][lower], word));
  }
  if (hasBadCapitalization(word)) {
    const normalized = lower.charAt(0).toLocaleUpperCase('da') + lower.slice(1);
    if (isWordCorrect(normalized, lang)) suggestions.push(normalized);
    if (isWordCorrect(lower, lang)) suggestions.push(lower);
  }
  const dict = spellDictionaries[lang] || spellDictionaries.da;
  const scored = [];
  for (const candidate of dict) {
    if (Math.abs(candidate.length - lower.length) > 2) continue;
    const dist = levenshtein(lower, candidate);
    if (dist > 0 && dist <= 2) scored.push({ word: candidate, dist });
  }
  scored.sort((a, b) => a.dist - b.dist || a.word.localeCompare(b.word, 'da'));
  scored.forEach(({ word: candidate }) => {
    const formatted = applyWordCase(candidate, word);
    if (!suggestions.includes(formatted)) suggestions.push(formatted);
  });
  return suggestions.slice(0, 6);
}

function editorCaretAtBoundary(editor, boundary) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed || !editor.contains(selection.anchorNode)) return false;
  const range = selection.getRangeAt(0).cloneRange();
  range.selectNodeContents(editor);
  if (boundary === 'start') range.setEnd(selection.anchorNode, selection.anchorOffset);
  else range.setStart(selection.anchorNode, selection.anchorOffset);
  return !range.toString().replace(/\u200b/g, '').length;
}

function placeCaretAtEditorBoundary(editor, boundary = 'end') {
  if (!editor) return;
  editor.focus();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(boundary === 'start');
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function mergeAdjacentSheet(direction) {
  const page = activePage();
  const editor = $('#editor');
  if (!page || !editor || page.pageView === 'infinite') return false;
  ensurePageSheets(page);
  const current = page.currentSheet;
  const other = current + direction;
  if (other < 0 || other >= page.sheets.length) return false;
  page.sheets[current] = editor.innerHTML;
  if (direction < 0) {
    page.sheets[other] = `${page.sheets[other]}${page.sheets[current]}`;
    page.sheets.splice(current, 1);
    page.sheetTitles.splice(current, 1);
    page.currentSheet = other;
  } else {
    page.sheets[current] = `${page.sheets[current]}${page.sheets[other]}`;
    page.sheets.splice(other, 1);
    page.sheetTitles.splice(other, 1);
  }
  page.html = page.sheets.join('<div class="page-break"></div>');
  persist();
  renderWorkspace();
  requestAnimationFrame(() => placeCaretAtEditorBoundary($('#editor'), direction < 0 ? 'end' : 'start'));
  return true;
}

function stopCrossPageBackspace() {
  crossPageBackspaceHeld = false;
  clearTimeout(crossPageBackspaceTimer);
}

function startCrossPageBackspace() {
  clearTimeout(crossPageBackspaceTimer);
  crossPageBackspaceTimer = setTimeout(() => {
    if (!crossPageBackspaceHeld) return;
    const editor = $('#editor');
    const page = activePage();
    if (!editor || !page) return stopCrossPageBackspace();
    if (editorCaretAtBoundary(editor, 'start') && page.currentSheet > 0) {
      mergeAdjacentSheet(-1);
    } else {
      editor.focus();
      document.execCommand('delete');
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    startCrossPageBackspace();
  }, 55);
}

function capitalizeTypedLetter(event, editor) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1 || !/\p{L}/u.test(event.key)) return false;
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.isCollapsed || !editor.contains(selection.anchorNode)) return false;
  const range = selection.getRangeAt(0).cloneRange();
  range.selectNodeContents(editor);
  range.setEnd(selection.anchorNode, selection.anchorOffset);
  const before = range.toString();
  if (!/(?:^|[.!?]\s+)$/u.test(before)) return false;
  const uppercase = event.key.toLocaleUpperCase(activePage()?.language || 'da');
  if (uppercase === event.key) return false;
  event.preventDefault();
  document.execCommand('insertText', false, uppercase);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function proofreadingFindings(text, language) {
  const findings = [];
  const grammarRules = language === 'da' ? [
    [/\b(jeg|du|han|hun|vi|de)\s+(er|har|kan|skal)\s+\1\b/gi, 'Mulig gentagelse i sætningen.'],
    [/\bfordi\s+at\b/gi, 'Overvej ofte blot “fordi”.'],
    [/\bderes\s+sin\b|\bsin\s+deres\b/gi, 'Kontrollér ejestedordet i denne sætning.'],
    [/\s{2,}/g, 'Der er flere mellemrum efter hinanden.'],
  ] : [
    [/\b(their|there|they're)\s+\1\b/gi, 'Possible repeated word.'],
    [/\b(a)\s+[aeiou]\w*/gi, 'Check whether “an” is needed here.'],
    [/\s{2,}/g, 'There are repeated spaces.'],
  ];
  grammarRules.forEach(([pattern, message]) => {
    const match = pattern.exec(text);
    if (match) findings.push({ type: 'grammar', excerpt: match[0], message });
  });
  const factualPatterns = [
    /\b(?:altid|aldrig|beviser|umuligt|alle|ingen)\b[^.!?]{8,120}[.!?]/gi,
    /\b\d+(?:[.,]\d+)?\s*(?:%|procent|år|millioner|milliarder)\b[^.!?]{0,100}/gi,
  ];
  factualPatterns.forEach(pattern => {
    const match = pattern.exec(text);
    if (match) findings.push({
      type: 'fact',
      excerpt: match[0].trim(),
      message: 'Kontrollér denne præcise eller kategoriske påstand mod din pensumkilde. Markeringen er ikke et facit.',
    });
  });
  return findings.slice(0, 6);
}

function renderProofreadingReport() {
  $('#proofreadingReport')?.remove();
}

function renderMathInEditor() {
  if (typeof katex === 'undefined') return;
  document.querySelectorAll('.math-render[data-latex]').forEach(el => {
    try { katex.render(el.dataset.latex, el, { throwOnError: false, displayMode: true }); } catch {}
  });
}

function responseText(json) {
  if (typeof json?.output_text === 'string' && json.output_text.trim()) return json.output_text.trim();
  return (json?.output || [])
    .flatMap(item => item?.content || [])
    .filter(item => item?.type === 'output_text' && typeof item.text === 'string')
    .map(item => item.text)
    .join('\n')
    .trim();
}

async function requestOpenAI(payload) {
  let lastError;
  const configuredBase = String(window.NOTEIT_API_BASE || appSettings.apiBase || localStorage.getItem('noteit-api-base') || '').replace(/\/$/, '');
  const endpoints = [...new Set([
    configuredBase ? `${configuredBase}/api/study-help` : '',
    location.protocol === 'http:' || location.protocol === 'https:' ? '/api/study-help' : '',
    'http://127.0.0.1:8766/api/study-help',
  ].filter(Boolean))];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      if (payload.signal) {
        if (payload.signal.aborted) controller.abort();
        else payload.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          const text = typeof json.text === 'string' ? json.text.trim() : responseText(json);
          if (!text) throw new Error('Studiehjælp returnerede et tomt svar. Prøv igen.');
          return text;
        }
        lastError = new Error(json.error?.message || `Forbindelsen svarede med status ${res.status}.`);
      } catch (error) {
        lastError = error.name === 'AbortError'
          ? new Error('Studiehjælp tog for lang tid. Prøv igen.')
          : error;
      } finally {
        clearTimeout(timeout);
      }
    }
    if (attempt === 1) throw lastError || new Error('Studiehjælp kunne ikke oprette forbindelse.');
    await new Promise(resolve => setTimeout(resolve, 700));
  }
  throw lastError || new Error('Studiehjælp kunne ikke oprette forbindelse.');
}

function cursorApiEndpoint() {
  const configuredBase = String(appSettings.apiBase || window.NOTEIT_API_BASE || localStorage.getItem('noteit-api-base') || '').replace(/\/$/, '');
  if (configuredBase) return `${configuredBase}${DEFAULT_CURSOR_API_ENDPOINT}`;
  if (location.protocol === 'http:' || location.protocol === 'https:') return `${location.origin}${DEFAULT_CURSOR_API_ENDPOINT}`;
  return `http://127.0.0.1:8766${DEFAULT_CURSOR_API_ENDPOINT}`;
}

function syncCursorApiSettings() {
  const input = $('#apiBaseSetting');
  const endpoint = $('#cursorApiEndpoint');
  if (input && document.activeElement !== input) input.value = appSettings.apiBase || '';
  if (endpoint) endpoint.textContent = cursorApiEndpoint();
}

function currentStudyContext(extra = {}) {
  const page = activePage();
  const subject = data.subjects.find(item => item.id === page?.subjectId);
  const notebook = data.semesters.find(item => item.id === subject?.semesterId);
  const documentText = editorDocumentText();
  return {
    app: "Note'it",
    language: page?.language || appSettings.defaultLanguage || 'da',
    noteTitle: page?.title || '',
    subject: subject?.name || '',
    notebook: notebook?.name || '',
    documentType: pageDocTypeLabel(page || { docType: 'general' }),
    nearbyNoteText: documentText.slice(0, 12000),
    ...extra,
  };
}

async function callAI(instructions, input, metadata = {}) {
  try {
    const result = await requestOpenAI({
      instructions,
      input,
      action: metadata.action || 'study-help',
      context: metadata.context || currentStudyContext(),
      history: Array.isArray(metadata.history) ? metadata.history.slice(-10) : [],
      signal: metadata.signal,
    });
    studyHelpConnection = 'online';
    renderStudyHelpStatus();
    updateSettingsStorageInfo();
    return result;
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    studyHelpConnection = 'local';
    renderStudyHelpStatus();
    updateSettingsStorageInfo();
    return localStudyAI(instructions, typeof input === 'string' ? input : JSON.stringify(input));
  }
}

async function callImageAI(dataUrl) {
  try {
    return await requestOpenAI({
      instructions: 'Du er en præcis studieassistent. Brug kun det, der faktisk kan aflæses i billedet. Gæt aldrig på ulæselig tekst.',
      input: [{ role: 'user', content: [{ type: 'input_text', text: 'Læs billedet som universitetsmateriale. Lav strukturerede noter med tydelige kildehenvisninger.' }, { type: 'input_image', image_url: dataUrl }] }],
    });
  } catch {
    return '## Billednoter\nBilledet er gemt i noten. Automatisk billedlæsning kræver forbindelse til appens sikre server.';
  }
}

function localStudyAI(instructions, input) {
  const clean = input.replace(/[ \t]+$/gm, '').trim();
  if (/faglig universitetsvejleder/i.test(instructions)) {
    const blocks = clean.split(/\n\n+/).map(block => {
      const split = block.indexOf(':');
      if (split < 0) return null;
      const label = block.slice(0, split).trim();
      const value = block.slice(split + 1).trim().replace(/^Eksempel:\s*/i, '');
      return label && value ? { label, value } : null;
    }).filter(Boolean);
    const fieldText = blocks.map(({ label, value }) => `## ${label}\n${value}`).join('\n\n');
    const isStem = /STEM|matematik|fysik|kemi|beregn|bevis|analyse/i.test(instructions + clean);
    const isLaw = /jura|rets|lov|dom/i.test(instructions + clean);
    const isHumanities = /humaniora|tekst|kilde|fortolk/i.test(instructions + clean);
    const check = isStem
      ? 'Kontrollér at alle antagelser er skrevet eksplicit, at hvert bevistrin følger af det forrige, og at symboler og enheder bruges konsekvent.'
      : isLaw
        ? 'Skeln tydeligt mellem faktum, regel, fortolkning og anvendelse. En konklusion bør kunne spores tilbage til en angivet retskilde.'
        : isHumanities
          ? 'Knyt hver fortolkning til et konkret tekststed eller en kilde, og adskil observation fra egen vurdering.'
          : 'Kontrollér at konklusionen faktisk følger af materialet, og markér oplysninger, der stadig mangler dokumentation.';
    return `${fieldText}\n\n## Faglig kontrol\n${check}\n\n## Næste skridt\nErstat eksemplerne med dine egne data eller dit eget materiale. Bevar strukturen, så resultatet kan efterprøves.`;
  }
  if (/rettet(?:e)? kode|Ret syntaksfejl|softwareudvikler/i.test(instructions)) {
    const code = clean.replace(/^Programmeringssprog:.*\nLibraries og pakker:.*\n\nKode:\n/s, '');
    return code.replace(/\t/g, '  ').replace(/\bvar\b/g, 'let');
  }
  if (/underviser i programmering|Forklar koden/i.test(instructions)) {
    const language = clean.match(/^Programmeringssprog:\s*(.+)$/m)?.[1] || 'det valgte sprog';
    const code = clean.replace(/^Programmeringssprog:.*\nLibraries og pakker:.*\n\nKode:\n/s, '');
    const lines = code.split('\n').filter(line => line.trim()).length;
    return `Overblik\nKoden er skrevet i ${language} og består af ${lines} aktive linjer.\n\nForløb\nProgrammet læses oppefra og ned. Funktioner og værdier oprettes først, hvorefter de efterfølgende kald udføres.\n\nKontrol\nTjek inputtyper, navngivning, fejlhåndtering og om alle funktioner returnerer det forventede resultat.`;
  }
  if (/Ret stavning|rettelse|grammatik|tegnsætning/i.test(instructions)) {
    const replacements = [
      [/\bik\b/gi, 'ikke'], [/\bdet\s+ska\b/gi, 'det skal'], [/\bman\s+ka\b/gi, 'man kan'],
      [/\bfordi\s+at\b/gi, 'fordi'], [/\bmassere\b/gi, 'masser af'], [/\binterresant\b/gi, 'interessant'],
      [/\bselvskab\b/gi, 'selskab'], [/\bvidre\b/gi, 'videre'], [/\bindenfor\b/gi, 'inden for'],
    ];
    return clean.split('\n').map(line => {
      let value = line.trim();
      replacements.forEach(([pattern, replacement]) => { value = value.replace(pattern, replacement); });
      value = value.replace(/\s+([,.;:!?])/g, '$1').replace(/([,.;:!?])(?=\S)/g, '$1 ');
      value = value.replace(/(^|[.!?]\s+)([a-zæøå])/g, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('da'));
      return value;
    }).join('\n');
  }
  if (/eksamensspørgsmål/i.test(instructions)) return '1. Hvad er hovedidéen?\n2. Nævn begreber.\n3. Giv eksempel.\n4. Hvilke formler er vigtige?';
  if (/forståelsestjek/i.test(instructions)) return `Spørgsmål\nForklar hovedideen med dine egne ord.\n\nHint\nFind først det vigtigste fagbegreb og beskriv derefter sammenhængen.\n\nEksempel\nKnyt begrebet til en konkret situation fra undervisningen.\n\nFacit\nEt godt svar indeholder en kort definition, en forklaring af sammenhængen og ét relevant eksempel.`;
  if (/resumé/i.test(instructions)) return clean.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
  const subject = clean.slice(0, 520) || 'det valgte emne';
  if (/opfølg|universitetsunderviser/i.test(instructions)) return `Kort fortalt hænger det sammen med, hvordan begrebet bruges i praksis.\n\nEt konkret eksempel: Tag udgangspunkt i “${subject.slice(0, 110)}”. Del først udsagnet op i årsag, virkning og fagligt begreb. Så bliver det tydeligt, hvad der forklarer hvad.\n\nHuskeregel: Definér begrebet, vis sammenhængen og afslut med ét eksempel.`;
  return `Helt enkelt\nTeksten handler om én central idé: Find det, der ændrer noget, og det resultat ændringen giver. Resten af teksten forklarer forbindelsen mellem de to.\n\nTænk på det sådan\nForestil dig en opskrift. Begreberne er ingredienserne, reglerne er fremgangsmåden, og konklusionen er det færdige resultat. Hvis du kun nævner ingredienserne, har du ikke forklaret, hvordan retten bliver til.\n\nTeksten opdelt\n${subject}\n\nSådan forklarer du den selv\n1. Sig med én enkel sætning, hvad emnet handler om.\n2. Forklar hvert fagord med almindelige ord.\n3. Vis forbindelsen mellem årsag, metode og resultat.\n4. Giv ét konkret eksempel.\n\nHuskeregel\nBetydning, sammenhæng, eksempel.`;
}

const modelColors = ['#7794ad', '#7fa9b8', '#76aaa1', '#86a68d', '#beb27c', '#c69b76', '#bd7d7d', '#b8819c', '#9682aa', '#7d8795', '#34373b', '#f8f5ef'];
function conceptModelSvg(title, labels) {
  const positions = [[360,80],[150,210],[360,210],[570,210],[245,350],[475,350]];
  return `<g data-model-part="${title}" class="model-part"><circle cx="360" cy="215" r="62" fill="#dce8ef" stroke="#58788e" stroke-width="5"/><text x="360" y="210" text-anchor="middle" font-size="18">${title}</text></g>
    <g data-model-part="Relationer" class="model-part">${positions.slice(0, labels.length).map(([x,y]) => `<line x1="360" y1="215" x2="${x}" y2="${y}" stroke="#8898a3" stroke-width="4"/>`).join('')}</g>
    ${labels.map((label, index) => { const [x,y] = positions[index]; return `<g data-model-part="${label}" class="model-part"><rect x="${x-68}" y="${y-27}" width="136" height="54" rx="13" fill="${index % 2 ? '#eee1cf' : '#e2d9eb'}" stroke="${index % 2 ? '#92764d' : '#79648b'}" stroke-width="4"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="15">${label}</text></g>`; }).join('')}`;
}
const modelTemplates = {
  molecule: {
    name: 'Molekyle', icon: 'H₂O',
    svg: `
      <g data-model-part="Oxygen" class="model-part"><circle cx="360" cy="205" r="72" fill="#ef4444" stroke="#991b1b" stroke-width="4"/><text x="360" y="218" text-anchor="middle" fill="#fff" font-size="36" font-weight="700">O</text></g>
      <g data-model-part="Binding venstre" class="model-part"><line x1="315" y1="245" x2="225" y2="315" stroke="#64748b" stroke-width="20" stroke-linecap="round"/></g>
      <g data-model-part="Binding højre" class="model-part"><line x1="405" y1="245" x2="495" y2="315" stroke="#64748b" stroke-width="20" stroke-linecap="round"/></g>
      <g data-model-part="Hydrogen 1" class="model-part"><circle cx="190" cy="340" r="50" fill="#e2e8f0" stroke="#64748b" stroke-width="4"/><text x="190" y="351" text-anchor="middle" fill="#334155" font-size="29" font-weight="700">H</text></g>
      <g data-model-part="Hydrogen 2" class="model-part"><circle cx="530" cy="340" r="50" fill="#e2e8f0" stroke="#64748b" stroke-width="4"/><text x="530" y="351" text-anchor="middle" fill="#334155" font-size="29" font-weight="700">H</text></g>`,
  },
  cell: {
    name: 'Biologisk celle', icon: '◉',
    svg: `
      <g data-model-part="Cellemembran" class="model-part"><ellipse cx="360" cy="220" rx="255" ry="155" fill="#dbeafe" stroke="#2563eb" stroke-width="9"/></g>
      <g data-model-part="Cytoplasma" class="model-part"><ellipse cx="360" cy="220" rx="225" ry="130" fill="#ecfeff" stroke="#67e8f9" stroke-width="3"/></g>
      <g data-model-part="Cellekerne" class="model-part"><circle cx="355" cy="210" r="72" fill="#c4b5fd" stroke="#7c3aed" stroke-width="5"/><circle cx="370" cy="195" r="23" fill="#8b5cf6"/></g>
      <g data-model-part="Mitokondrie" class="model-part"><path d="M170 205 C190 165 255 165 275 205 C250 250 195 250 170 205Z" fill="#fdba74" stroke="#ea580c" stroke-width="4"/><path d="M188 205 q18-24 35 0 t35 0" fill="none" stroke="#c2410c" stroke-width="4"/></g>
      <g data-model-part="Ribosomer" class="model-part" fill="#0f766e"><circle cx="470" cy="155" r="8"/><circle cx="500" cy="205" r="8"/><circle cx="455" cy="285" r="8"/><circle cx="260" cy="290" r="8"/></g>`,
  },
  circuit: {
    name: 'Elektronik', icon: '⚡',
    svg: `
      <g data-model-part="Strømkilde" class="model-part"><rect x="85" y="155" width="115" height="120" rx="12" fill="#dbeafe" stroke="#1d4ed8" stroke-width="5"/><text x="142" y="225" text-anchor="middle" font-size="33" font-weight="700" fill="#1d4ed8">9V</text></g>
      <g data-model-part="Ledningsnet" class="model-part"><path d="M200 215 H290 M430 215 H590 V330 H145 V275" fill="none" stroke="#334155" stroke-width="8" stroke-linejoin="round"/></g>
      <g data-model-part="Modstand" class="model-part"><path d="M290 215 l18-22 22 44 22-44 22 44 22-44 22 22 h12" fill="none" stroke="#f97316" stroke-width="8" stroke-linejoin="round"/><text x="360" y="170" text-anchor="middle" font-size="18" fill="#9a3412">R1 · 220 Ω</text></g>
      <g data-model-part="LED" class="model-part"><circle cx="590" cy="215" r="42" fill="#fda4af" stroke="#be123c" stroke-width="5"/><path d="M570 215 h40 M590 195 v40" stroke="#fff" stroke-width="5"/><text x="590" y="145" text-anchor="middle" font-size="18" fill="#9f1239">LED</text></g>
      <g data-model-part="Målepunkt" class="model-part"><circle cx="360" cy="330" r="28" fill="#dcfce7" stroke="#16a34a" stroke-width="5"/><text x="360" y="337" text-anchor="middle" font-size="17" font-weight="700" fill="#166534">TP1</text></g>`,
  },
  robot: {
    name: 'Robotarm', icon: 'R',
    svg: `
      <g data-model-part="Base" class="model-part"><path d="M235 350 L300 300 H420 L485 350 L450 385 H270Z" fill="#94a3b8" stroke="#334155" stroke-width="5"/></g>
      <g data-model-part="Led 1" class="model-part"><circle cx="360" cy="300" r="48" fill="#38bdf8" stroke="#0369a1" stroke-width="5"/></g>
      <g data-model-part="Arm 1" class="model-part"><path d="M340 275 L290 155 Q285 135 305 128 L340 120 Q355 118 360 138 L385 272Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="5"/></g>
      <g data-model-part="Led 2" class="model-part"><circle cx="320" cy="135" r="38" fill="#facc15" stroke="#a16207" stroke-width="5"/></g>
      <g data-model-part="Arm 2" class="model-part"><path d="M340 120 L500 175 L480 225 L325 170Z" fill="#818cf8" stroke="#4338ca" stroke-width="5"/></g>
      <g data-model-part="Griber" class="model-part"><circle cx="500" cy="200" r="31" fill="#f97316" stroke="#c2410c" stroke-width="5"/><path d="M520 185 l55-35 M520 215 l55 35" stroke="#c2410c" stroke-width="13" stroke-linecap="round"/></g>`,
  },
  mechanics: {
    name: 'Mekanik', icon: 'F',
    svg: `
      <g data-model-part="Legeme" class="model-part"><path d="M255 155 L480 155 L535 225 L310 225Z" fill="#93c5fd" stroke="#1d4ed8" stroke-width="5"/><path d="M310 225 L535 225 L485 330 L260 330Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="5"/><path d="M255 155 L310 225 L260 330 L205 255Z" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="5"/></g>
      <g data-model-part="Tyngdekraft" class="model-part"><path d="M370 235 V380" stroke="#ef4444" stroke-width="8"/><path d="M350 355 L370 385 L390 355" fill="#ef4444"/><text x="395" y="365" font-size="22" font-weight="700" fill="#b91c1c">Fᵍ</text></g>
      <g data-model-part="Normalkraft" class="model-part"><path d="M370 150 V55" stroke="#22c55e" stroke-width="8"/><path d="M350 80 L370 50 L390 80" fill="#22c55e"/><text x="395" y="78" font-size="22" font-weight="700" fill="#15803d">Fₙ</text></g>
      <g data-model-part="Underlag" class="model-part"><line x1="120" y1="385" x2="610" y2="385" stroke="#475569" stroke-width="8"/><path d="M150 385 l-25 25 M210 385 l-25 25 M270 385 l-25 25 M330 385 l-25 25 M390 385 l-25 25 M450 385 l-25 25 M510 385 l-25 25 M570 385 l-25 25" stroke="#94a3b8" stroke-width="4"/></g>`,
  },
  geometry: {
    name: '3D-geometri', icon: '3D',
    svg: `
      <g data-model-part="Topflade" class="model-part"><path d="M210 155 L410 85 L555 170 L350 245Z" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="5"/></g>
      <g data-model-part="Venstre flade" class="model-part"><path d="M210 155 L350 245 L350 370 L210 280Z" fill="#93c5fd" stroke="#1d4ed8" stroke-width="5"/></g>
      <g data-model-part="Højre flade" class="model-part"><path d="M350 245 L555 170 L555 295 L350 370Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="5"/></g>
      <g data-model-part="Diagonal" class="model-part"><line x1="210" y1="155" x2="555" y2="295" stroke="#ef4444" stroke-width="6" stroke-dasharray="12 8"/><text x="405" y="205" font-size="20" font-weight="700" fill="#b91c1c">d</text></g>
      <g data-model-part="Akser" class="model-part"><path d="M115 350 H205 M115 350 V260 M115 350 L75 390" fill="none" stroke="#334155" stroke-width="5"/><text x="210" y="356" font-size="18">x</text><text x="105" y="250" font-size="18">y</text><text x="55" y="410" font-size="18">z</text></g>`,
  },
  brain: {
    name: 'Hjerne og nervesystem', icon: '🧠',
    svg: `
      <g data-model-part="Venstre hjernehalvdel" class="model-part"><path d="M350 105 C255 45 130 115 150 225 C95 285 170 375 290 345 C330 380 355 320 350 105Z" fill="#f4a8b8" stroke="#9f5267" stroke-width="5"/></g>
      <g data-model-part="Højre hjernehalvdel" class="model-part"><path d="M370 105 C465 45 590 115 570 225 C625 285 550 375 430 345 C390 380 365 320 370 105Z" fill="#efb6c2" stroke="#9f5267" stroke-width="5"/></g>
      <g data-model-part="Frontallap" class="model-part"><path d="M180 170 Q250 90 345 130 L340 230 Q245 250 170 215Z" fill="#f9c5d1" stroke="#b56578" stroke-width="4"/><text x="228" y="178" font-size="13" font-weight="700" fill="#7a3d4f">Frontallap</text></g>
      <g data-model-part="Parietallap" class="model-part"><path d="M300 120 Q360 95 420 130 L415 220 Q355 235 300 210Z" fill="#f5d0b8" stroke="#a86f45" stroke-width="4"/><text x="335" y="168" font-size="12" font-weight="700" fill="#7a4a28">Parietallap</text></g>
      <g data-model-part="Temporallap" class="model-part"><path d="M155 230 Q200 180 255 220 L240 300 Q185 320 150 285Z" fill="#e8c4f0" stroke="#7a4f8a" stroke-width="4"/><text x="178" y="258" font-size="11" font-weight="700" fill="#5c3568">Temporallap</text></g>
      <g data-model-part="Occipitallap" class="model-part"><path d="M455 170 Q520 200 545 260 L490 310 Q440 280 430 230Z" fill="#c8dff5" stroke="#4a6f8a" stroke-width="4"/><text x="468" y="248" font-size="11" font-weight="700" fill="#2f4f68">Occipitallap</text></g>
      <g data-model-part="Hippocampus" class="model-part"><ellipse cx="285" cy="285" rx="34" ry="18" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="285" y="290" text-anchor="middle" font-size="10" font-weight="700" fill="#4c1d95">Hippocampus</text></g>
      <g data-model-part="Amygdala" class="model-part"><circle cx="318" cy="268" r="16" fill="#fda4af" stroke="#be123c" stroke-width="4"/><text x="318" y="272" text-anchor="middle" font-size="9" font-weight="700" fill="#9f1239">Amygdala</text></g>
      <g data-model-part="Thalamus" class="model-part"><ellipse cx="360" cy="252" rx="22" ry="14" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="360" y="256" text-anchor="middle" font-size="9" font-weight="700" fill="#92400e">Thalamus</text></g>
      <g data-model-part="Lillehjerne" class="model-part"><ellipse cx="500" cy="320" rx="78" ry="50" fill="#d8b4e2" stroke="#825596" stroke-width="5"/><text x="500" y="326" text-anchor="middle" font-size="12" font-weight="700" fill="#5b2d6e">Lillehjerne</text></g>
      <g data-model-part="Hjernestamme" class="model-part"><path d="M365 300 Q390 345 385 410 H335 Q335 350 350 300Z" fill="#f1c27d" stroke="#9a6a35" stroke-width="5"/><text x="360" y="368" text-anchor="middle" font-size="11" font-weight="700" fill="#6b4518">Hjernestamme</text></g>
      <g data-model-part="Motorisk cortex" class="model-part"><path d="M195 145 Q240 115 300 135 L295 185 Q235 195 190 175Z" fill="#bbf7d0" stroke="#15803d" stroke-width="3" opacity=".85"/><text x="238" y="162" font-size="10" font-weight="700" fill="#166534">Motorisk</text></g>
      <g data-model-part="Sensorisk cortex" class="model-part"><path d="M310 135 Q355 120 400 145 L395 190 Q350 200 305 185Z" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="3" opacity=".85"/><text x="345" y="162" font-size="10" font-weight="700" fill="#1e3a8a">Sensorisk</text></g>`,
  },
  memoryModel: {
    name: 'Hukommelsesmodel', icon: 'M',
    svg: `
      <g data-model-part="Sanseindtryk" class="model-part"><rect x="60" y="170" width="130" height="58" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text x="125" y="204" text-anchor="middle" font-size="14" font-weight="700">Sanseindtryk</text></g>
      <g data-model-part="Korttidshukommelse" class="model-part"><rect x="250" y="95" width="220" height="70" rx="16" fill="#fde68a" stroke="#b45309" stroke-width="5"/><text x="360" y="138" text-anchor="middle" font-size="15" font-weight="700">Korttidshukommelse</text></g>
      <g data-model-part="Arbejdshukommelse" class="model-part"><rect x="285" y="210" width="150" height="58" rx="14" fill="#fbcfe8" stroke="#be185d" stroke-width="4"/><text x="360" y="244" text-anchor="middle" font-size="13" font-weight="700">Arbejdshukommelse</text></g>
      <g data-model-part="Langtidshukommelse" class="model-part"><rect x="500" y="155" width="170" height="90" rx="16" fill="#bbf7d0" stroke="#15803d" stroke-width="5"/><text x="585" y="195" text-anchor="middle" font-size="14" font-weight="700">Langtidshukommelse</text></g>
      <g data-model-part="Semantisk hukommelse" class="model-part"><rect x="520" y="290" width="140" height="52" rx="12" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="590" y="322" text-anchor="middle" font-size="12" font-weight="700">Semantisk</text></g>
      <g data-model-part="Episodisk hukommelse" class="model-part"><rect x="350" y="320" width="150" height="52" rx="12" fill="#a7f3d0" stroke="#047857" stroke-width="4"/><text x="425" y="352" text-anchor="middle" font-size="12" font-weight="700">Episodisk</text></g>
      <g data-model-part="Dataflow" class="model-part"><path d="M190 198 H250 M470 130 H500 M360 165 V210 M585 245 V290 M425 268 H500" stroke="#64748b" stroke-width="6" marker-end="url(#arrow)"/><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#64748b"/></marker></defs></g>`,
  },
  cognition: {
    name: 'Kognitiv proces', icon: '↻',
    svg: `
      <g data-model-part="Stimulus" class="model-part"><rect x="70" y="175" width="120" height="60" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text x="130" y="210" text-anchor="middle" font-size="14" font-weight="700">Stimulus</text></g>
      <g data-model-part="Perception" class="model-part"><rect x="230" y="95" width="130" height="60" rx="14" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="295" y="130" text-anchor="middle" font-size="14" font-weight="700">Perception</text></g>
      <g data-model-part="Opmærksomhed" class="model-part"><rect x="230" y="255" width="130" height="60" rx="14" fill="#fbcfe8" stroke="#be185d" stroke-width="4"/><text x="295" y="290" text-anchor="middle" font-size="13" font-weight="700">Opmærksomhed</text></g>
      <g data-model-part="Beslutning" class="model-part"><rect x="420" y="175" width="120" height="60" rx="14" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="480" y="210" text-anchor="middle" font-size="14" font-weight="700">Beslutning</text></g>
      <g data-model-part="Handling" class="model-part"><rect x="560" y="175" width="120" height="60" rx="14" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="620" y="210" text-anchor="middle" font-size="14" font-weight="700">Handling</text></g>
      <g data-model-part="Feedback" class="model-part"><path d="M620 235 C620 330 130 330 130 235" fill="none" stroke="#64748b" stroke-width="5" stroke-dasharray="10 7"/><text x="375" y="355" text-anchor="middle" font-size="12" font-weight="700" fill="#64748b">Feedback</text></g>
      <g data-model-part="Procesflow" class="model-part"><path d="M190 205 H230 M360 125 H420 M360 205 H420 M480 205 H560" stroke="#64748b" stroke-width="6"/></g>`,
  },
  robotFlow: {
    name: 'Robot-flow', icon: 'R',
    svg: `
      <g data-model-part="Sensorer" class="model-part"><rect x="55" y="85" width="125" height="70" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="5"/><text x="117" y="118" text-anchor="middle" font-size="13" font-weight="700">Sensorer</text><text x="117" y="138" text-anchor="middle" font-size="10" fill="#1e40af">Lidar · Kamera · IMU</text></g>
      <g data-model-part="Perception" class="model-part"><rect x="55" y="255" width="125" height="70" rx="14" fill="#fde68a" stroke="#b45309" stroke-width="5"/><text x="117" y="288" text-anchor="middle" font-size="13" font-weight="700">Perception</text><text x="117" y="308" text-anchor="middle" font-size="10" fill="#92400e">Kortlægning · Objekt</text></g>
      <g data-model-part="Planlægning" class="model-part"><rect x="255" y="170" width="140" height="70" rx="14" fill="#c4b5fd" stroke="#6d28d9" stroke-width="5"/><text x="325" y="203" text-anchor="middle" font-size="13" font-weight="700">Planlægning</text><text x="325" y="223" text-anchor="middle" font-size="10" fill="#4c1d95">Path · Beslutning</text></g>
      <g data-model-part="Styring" class="model-part"><rect x="470" y="170" width="125" height="70" rx="14" fill="#fbcfe8" stroke="#be185d" stroke-width="5"/><text x="532" y="203" text-anchor="middle" font-size="13" font-weight="700">Styring</text><text x="532" y="223" text-anchor="middle" font-size="10" fill="#9d174d">PID · Motor</text></g>
      <g data-model-part="Aktuatorer" class="model-part"><rect x="470" y="55" width="125" height="70" rx="14" fill="#bbf7d0" stroke="#15803d" stroke-width="5"/><text x="532" y="88" text-anchor="middle" font-size="13" font-weight="700">Aktuatorer</text><text x="532" y="108" text-anchor="middle" font-size="10" fill="#166534">Hjul · Arm · LED</text></g>
      <g data-model-part="Feedback" class="model-part"><path d="M532 125 V155 M325 240 V290 H117 V255 M325 120 V85 H532" fill="none" stroke="#64748b" stroke-width="6"/><text x="400" y="78" font-size="11" font-weight="700" fill="#64748b">Feedback-loop</text></g>
      <g data-model-part="ROS node" class="model-part"><rect x="255" y="300" width="140" height="58" rx="12" fill="#e2e8f0" stroke="#475569" stroke-width="4"/><text x="325" y="334" text-anchor="middle" font-size="12" font-weight="700">ROS / Middleware</text></g>`,
  },
  dataStructure: {
    name: 'Datastruktur', icon: '</>',
    svg: `<g data-model-part="Rodnode" class="model-part"><rect x="300" y="55" width="120" height="62" rx="14" fill="#b9d5e8" stroke="#426985" stroke-width="5"/><text x="360" y="93" text-anchor="middle" font-size="20">Root</text></g>
      <g data-model-part="Forbindelser" class="model-part"><path d="M330 117 L210 190 M390 117 L510 190 M210 252 L145 325 M210 252 L275 325 M510 252 L445 325 M510 252 L575 325" stroke="#64748b" stroke-width="6"/></g>
      <g data-model-part="Venstre node" class="model-part"><rect x="150" y="190" width="120" height="62" rx="14" fill="#c6e1d8" stroke="#477c6c" stroke-width="5"/><text x="210" y="228" text-anchor="middle" font-size="18">A</text></g>
      <g data-model-part="Højre node" class="model-part"><rect x="450" y="190" width="120" height="62" rx="14" fill="#d9cae8" stroke="#785e91" stroke-width="5"/><text x="510" y="228" text-anchor="middle" font-size="18">B</text></g>
      <g data-model-part="Blade" class="model-part"><rect x="95" y="325" width="100" height="54" rx="12" fill="#f3d8ad" stroke="#9a743c" stroke-width="4"/><rect x="225" y="325" width="100" height="54" rx="12" fill="#f3d8ad" stroke="#9a743c" stroke-width="4"/><rect x="395" y="325" width="100" height="54" rx="12" fill="#f3d8ad" stroke="#9a743c" stroke-width="4"/><rect x="525" y="325" width="100" height="54" rx="12" fill="#f3d8ad" stroke="#9a743c" stroke-width="4"/></g>`,
  },
  network: {
    name: 'Netværk og systemarkitektur', icon: '◎',
    svg: `<g data-model-part="Klienter" class="model-part"><rect x="70" y="95" width="135" height="85" rx="12" fill="#dbeafe" stroke="#47749a" stroke-width="5"/><rect x="70" y="270" width="135" height="85" rx="12" fill="#dbeafe" stroke="#47749a" stroke-width="5"/></g>
      <g data-model-part="API" class="model-part"><rect x="292" y="175" width="140" height="88" rx="18" fill="#c7e4d7" stroke="#42735e" stroke-width="5"/><text x="362" y="227" text-anchor="middle" font-size="24">API</text></g>
      <g data-model-part="Database" class="model-part"><path d="M515 145 Q590 110 665 145 V295 Q590 330 515 295Z" fill="#e3d6ef" stroke="#72558d" stroke-width="5"/><ellipse cx="590" cy="145" rx="75" ry="28" fill="#eee5f5" stroke="#72558d" stroke-width="5"/></g>
      <g data-model-part="Dataflow" class="model-part"><path d="M205 138 H292 M205 312 H292 M432 218 H515" stroke="#64748b" stroke-width="8" stroke-dasharray="14 8"/></g>`,
  },
  economics: {
    name: 'Økonomisk model', icon: '%',
    svg: `<g data-model-part="Akser" class="model-part"><path d="M115 350 H630 M115 350 V65" stroke="#334155" stroke-width="6"/></g>
      <g data-model-part="Efterspørgsel" class="model-part"><path d="M165 100 C300 155 425 250 580 330" fill="none" stroke="#668bab" stroke-width="9"/><text x="540" y="300" font-size="20">D</text></g>
      <g data-model-part="Udbud" class="model-part"><path d="M165 330 C310 250 420 155 580 100" fill="none" stroke="#9b7b9e" stroke-width="9"/><text x="540" y="125" font-size="20">S</text></g>
      <g data-model-part="Ligevægt" class="model-part"><circle cx="370" cy="216" r="15" fill="#e49a72"/><path d="M370 216 V350 M370 216 H115" stroke="#e49a72" stroke-width="4" stroke-dasharray="9 7"/></g>`,
  },
  language: {
    name: 'Sproglig analyse', icon: 'Aa',
    svg: `<g data-model-part="Hovedsætning" class="model-part"><rect x="245" y="55" width="230" height="65" rx="15" fill="#d8e5ef" stroke="#58778f" stroke-width="5"/><text x="360" y="95" text-anchor="middle" font-size="21">Hovedsætning</text></g>
      <g data-model-part="Subjekt" class="model-part"><rect x="90" y="210" width="170" height="65" rx="15" fill="#d5eadf" stroke="#557c67" stroke-width="5"/><text x="175" y="250" text-anchor="middle" font-size="21">Subjekt</text></g>
      <g data-model-part="Verballed" class="model-part"><rect x="275" y="210" width="170" height="65" rx="15" fill="#f0dfbd" stroke="#957544" stroke-width="5"/><text x="360" y="250" text-anchor="middle" font-size="21">Verballed</text></g>
      <g data-model-part="Objekt" class="model-part"><rect x="460" y="210" width="170" height="65" rx="15" fill="#e7d5ea" stroke="#806087" stroke-width="5"/><text x="545" y="250" text-anchor="middle" font-size="21">Objekt</text></g>
      <g data-model-part="Relationer" class="model-part"><path d="M360 120 L175 210 M360 120 V210 M360 120 L545 210" stroke="#6b7280" stroke-width="6"/></g>`,
  },
  law: {
    name: 'Juridisk argumentation', icon: '§',
    svg: `<g data-model-part="Retsregel" class="model-part"><rect x="250" y="45" width="220" height="70" rx="15" fill="#d9e5ee" stroke="#55758d" stroke-width="5"/><text x="360" y="88" text-anchor="middle" font-size="22">Retsregel</text></g>
      <g data-model-part="Faktum" class="model-part"><rect x="75" y="205" width="170" height="75" rx="15" fill="#e9dfc9" stroke="#8d7447" stroke-width="5"/><text x="160" y="250" text-anchor="middle" font-size="22">Faktum</text></g>
      <g data-model-part="Fortolkning" class="model-part"><rect x="275" y="205" width="170" height="75" rx="15" fill="#e1d5eb" stroke="#775d8b" stroke-width="5"/><text x="360" y="250" text-anchor="middle" font-size="20">Fortolkning</text></g>
      <g data-model-part="Konklusion" class="model-part"><rect x="475" y="205" width="170" height="75" rx="15" fill="#d2e8dc" stroke="#527a65" stroke-width="5"/><text x="560" y="250" text-anchor="middle" font-size="20">Konklusion</text></g>
      <g data-model-part="Argumentflow" class="model-part"><path d="M360 115 L160 205 M360 115 V205 M360 115 L560 205 M245 242 H275 M445 242 H475" stroke="#64748b" stroke-width="6"/></g>`,
  },
  timeline: {
    name: 'Tidslinje og udvikling', icon: '↦',
    svg: `<g data-model-part="Tidsakse" class="model-part"><path d="M80 225 H650" stroke="#596b78" stroke-width="9"/><path d="M630 205 L660 225 L630 245" fill="#596b78"/></g>
      <g data-model-part="Periode 1" class="model-part"><circle cx="160" cy="225" r="23" fill="#a8c8dd" stroke="#456b83" stroke-width="5"/><rect x="90" y="95" width="140" height="78" rx="14" fill="#e6f0f6" stroke="#7595aa" stroke-width="4"/><text x="160" y="128" text-anchor="middle" font-size="17">Begyndelse</text><text x="160" y="151" text-anchor="middle" font-size="13">Kontekst</text></g>
      <g data-model-part="Periode 2" class="model-part"><circle cx="360" cy="225" r="23" fill="#d4b7df" stroke="#775887" stroke-width="5"/><rect x="290" y="280" width="140" height="78" rx="14" fill="#f1e9f4" stroke="#987ba5" stroke-width="4"/><text x="360" y="313" text-anchor="middle" font-size="17">Vendepunkt</text><text x="360" y="336" text-anchor="middle" font-size="13">Årsag</text></g>
      <g data-model-part="Periode 3" class="model-part"><circle cx="555" cy="225" r="23" fill="#b6d8c6" stroke="#507963" stroke-width="5"/><rect x="485" y="95" width="140" height="78" rx="14" fill="#e9f4ee" stroke="#789b87" stroke-width="4"/><text x="555" y="128" text-anchor="middle" font-size="17">Resultat</text><text x="555" y="151" text-anchor="middle" font-size="13">Konsekvens</text></g>`,
  },
  dna: { name: 'DNA og genetik', icon: 'DNA', svg: conceptModelSvg('DNA', ['Gen', 'Kromosom', 'Basepar', 'Protein', 'Mutation']) },
  ecosystem: { name: 'Økosystem', icon: 'Eco', svg: conceptModelSvg('Økosystem', ['Producenter', 'Forbrugere', 'Nedbrydere', 'Energi', 'Næringsstoffer']) },
  anatomy: { name: 'Anatomi', icon: '+', svg: conceptModelSvg('Kroppen', ['Hjerne', 'Hjerte', 'Lunger', 'Lever', 'Nyrer']) },
  functionGraph: { name: 'Funktionsanalyse', icon: 'f(x)', svg: conceptModelSvg('Funktion', ['Definitionsmængde', 'Nulpunkter', 'Afledt', 'Ekstrema', 'Integral']) },
  probability: { name: 'Sandsynlighedstræ', icon: 'P', svg: conceptModelSvg('Udfald', ['Gren A', 'Gren B', 'Betinget P', 'Forventning', 'Varians']) },
  matrixMap: { name: 'Matrixtransformation', icon: '[ ]', svg: conceptModelSvg('Matrix A', ['Vektor x', 'Rotation', 'Skalering', 'Determinant', 'Resultat']) },
  algorithmFlow: {
    name: 'Algoritme-flow', icon: '{}',
    svg: `
      <g data-model-part="Start" class="model-part"><ellipse cx="360" cy="48" rx="68" ry="30" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="360" y="54" text-anchor="middle" font-size="14" font-weight="700">Start</text></g>
      <g data-model-part="Input" class="model-part"><rect x="280" y="105" width="160" height="54" rx="12" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text x="360" y="138" text-anchor="middle" font-size="14" font-weight="700">Input</text></g>
      <g data-model-part="Betingelse" class="model-part"><path d="M360 175 L430 210 L360 245 L290 210Z" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="360" y="215" text-anchor="middle" font-size="12" font-weight="700">Betingelse?</text></g>
      <g data-model-part="Løkke" class="model-part"><rect x="95" y="280" width="150" height="54" rx="12" fill="#fbcfe8" stroke="#be185d" stroke-width="4"/><text x="170" y="313" text-anchor="middle" font-size="13" font-weight="700">Løkke / gentag</text></g>
      <g data-model-part="Funktion" class="model-part"><rect x="475" y="280" width="150" height="54" rx="12" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="550" y="313" text-anchor="middle" font-size="13" font-weight="700">Funktion / proces</text></g>
      <g data-model-part="Output" class="model-part"><rect x="280" y="360" width="160" height="54" rx="12" fill="#e2e8f0" stroke="#475569" stroke-width="4"/><text x="360" y="393" text-anchor="middle" font-size="14" font-weight="700">Output</text></g>
      <g data-model-part="Flow" class="model-part"><path d="M360 78 V105 M360 159 V175 M290 210 H170 V280 M430 210 H550 V280 M360 245 V280 H475 M170 334 H280 M435 334 H475 M360 334 V360" stroke="#64748b" stroke-width="5"/></g>`,
  },
  database: { name: 'Database-model', icon: 'DB', svg: conceptModelSvg('Database', ['Tabel', 'Primærnøgle', 'Relation', 'Query', 'Indeks']) },
  cybersecurity: { name: 'Cybersikkerhed', icon: 'SEC', svg: conceptModelSvg('System', ['Trussel', 'Sårbarhed', 'Kontrol', 'Risiko', 'Respons']) },
  philosophy: { name: 'Filosofisk argument', icon: 'Φ', svg: conceptModelSvg('Tese', ['Præmis 1', 'Præmis 2', 'Indvending', 'Svar', 'Konklusion']) },
  sourceAnalysis: { name: 'Kildeanalyse', icon: '¶', svg: conceptModelSvg('Kilde', ['Afsender', 'Kontekst', 'Formål', 'Tendens', 'Troværdighed']) },
  society: { name: 'Samfundsmodel', icon: '◎', svg: conceptModelSvg('Samfund', ['Stat', 'Marked', 'Borger', 'Institution', 'Magt']) },
  protein: { name: 'Proteinstruktur', icon: 'P', svg: conceptModelSvg('Protein', ['Primær', 'Sekundær', 'Tertiær', 'Binding', 'Funktion']) },
  immune: { name: 'Immunsystem', icon: 'IM', svg: conceptModelSvg('Immunrespons', ['Antigen', 'B-celle', 'T-celle', 'Antistof', 'Hukommelse']) },
  calculus: { name: 'Differentialregning', icon: 'dy', svg: conceptModelSvg('Afledt', ['Sekant', 'Tangent', 'Grænseværdi', 'Hældning', 'Optimering']) },
  controlSystem: { name: 'Reguleringssystem', icon: 'PID', svg: conceptModelSvg('Feedback', ['Reference', 'Regulator', 'Proces', 'Sensor', 'Fejl']) },
  softwareArchitecture: { name: 'Softwarearkitektur', icon: 'SW', svg: conceptModelSvg('System', ['Frontend', 'API', 'Service', 'Database', 'Sikkerhed']) },
  rhetoric: { name: 'Retorisk analyse', icon: 'R', svg: conceptModelSvg('Budskab', ['Ethos', 'Logos', 'Pathos', 'Modtager', 'Kontekst']) },
  accounting: { name: 'Regnskabsmodel', icon: 'K', svg: conceptModelSvg('Regnskab', ['Aktiver', 'Passiver', 'Indtægt', 'Omkostning', 'Likviditet']) },
  researchDesign: { name: 'Forskningsdesign', icon: 'FD', svg: conceptModelSvg('Studie', ['Spørgsmål', 'Teori', 'Metode', 'Data', 'Analyse']) },
  maslow: {
    name: 'Behovspyramide', icon: '△',
    svg: `
      <g data-model-part="Selvrealisering" class="model-part"><path d="M280 70 L440 70 L360 120Z" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="360" y="102" text-anchor="middle" font-size="11" font-weight="700">Selvrealisering</text></g>
      <g data-model-part="Anerkendelse" class="model-part"><path d="M250 120 L470 120 L360 175Z" fill="#fbcfe8" stroke="#be185d" stroke-width="4"/><text x="360" y="155" text-anchor="middle" font-size="11" font-weight="700">Anerkendelse</text></g>
      <g data-model-part="Tilhørsforhold" class="model-part"><path d="M220 175 L500 175 L360 235Z" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="360" y="212" text-anchor="middle" font-size="11" font-weight="700">Tilhørsforhold</text></g>
      <g data-model-part="Sikkerhed" class="model-part"><path d="M190 235 L530 235 L360 300Z" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="360" y="275" text-anchor="middle" font-size="11" font-weight="700">Sikkerhed</text></g>
      <g data-model-part="Fysiologiske behov" class="model-part"><path d="M160 300 L560 300 L360 370Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="4"/><text x="360" y="345" text-anchor="middle" font-size="11" font-weight="700">Fysiologiske behov</text></g>`,
  },
  learningCycle: {
    name: 'Læringscyklus', icon: '↻',
    svg: `
      <g data-model-part="Erfaring" class="model-part"><rect x="300" y="55" width="120" height="54" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text x="360" y="88" text-anchor="middle" font-size="13" font-weight="700">Erfaring</text></g>
      <g data-model-part="Refleksion" class="model-part"><rect x="500" y="175" width="120" height="54" rx="14" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="560" y="208" text-anchor="middle" font-size="13" font-weight="700">Refleksion</text></g>
      <g data-model-part="Konceptualisering" class="model-part"><rect x="300" y="310" width="120" height="54" rx="14" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="360" y="338" text-anchor="middle" font-size="11" font-weight="700">Konceptualisering</text></g>
      <g data-model-part="Eksperimentering" class="model-part"><rect x="100" y="175" width="120" height="54" rx="14" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="160" y="203" text-anchor="middle" font-size="11" font-weight="700">Eksperimentering</text></g>
      <g data-model-part="Cyklus" class="model-part"><path d="M360 109 C430 130 500 150 560 175 M560 229 C500 260 430 290 360 310 M300 310 C230 290 160 260 100 229 M100 175 C160 150 230 130 300 109" fill="none" stroke="#64748b" stroke-width="5" marker-end="url(#arrow)"/></g>`,
  },
  stressModel: {
    name: 'Stressrespons', icon: '⚡',
    svg: `
      <g data-model-part="Stressor" class="model-part"><rect x="70" y="185" width="110" height="58" rx="14" fill="#fecaca" stroke="#dc2626" stroke-width="4"/><text x="125" y="218" text-anchor="middle" font-size="13" font-weight="700">Stressor</text></g>
      <g data-model-part="Amygdala" class="model-part"><circle cx="285" cy="214" r="42" fill="#fda4af" stroke="#be123c" stroke-width="4"/><text x="285" y="210" text-anchor="middle" font-size="11" font-weight="700">Amygdala</text><text x="285" y="224" text-anchor="middle" font-size="9">alarm</text></g>
      <g data-model-part="HPA-akse" class="model-part"><rect x="390" y="95" width="120" height="54" rx="12" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="450" y="128" text-anchor="middle" font-size="12" font-weight="700">HPA-akse</text></g>
      <g data-model-part="Kortisol" class="model-part"><rect x="390" y="280" width="120" height="54" rx="12" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="450" y="313" text-anchor="middle" font-size="12" font-weight="700">Kortisol</text></g>
      <g data-model-part="Fight/flight" class="model-part"><rect x="540" y="185" width="120" height="58" rx="14" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="600" y="210" text-anchor="middle" font-size="12" font-weight="700">Fight/flight</text><text x="600" y="226" text-anchor="middle" font-size="9">adfærd</text></g>
      <g data-model-part="Signalveje" class="model-part"><path d="M180 214 H243 M327 214 H390 M450 149 V214 H540 M450 280 V242 H327" stroke="#64748b" stroke-width="5"/></g>`,
  },
  heartModel: {
    name: 'Hjerte og kredsløb', icon: '♥',
    svg: `
      <g data-model-part="Højre atrium" class="model-part"><path d="M255 170 C255 120 310 95 360 110 C310 130 280 155 255 170Z" fill="#fecaca" stroke="#dc2626" stroke-width="4"/><text x="295" y="138" font-size="10" font-weight="700">H. atrium</text></g>
      <g data-model-part="Højre ventrikel" class="model-part"><path d="M255 170 C240 220 255 300 310 330 C280 260 265 210 255 170Z" fill="#fca5a5" stroke="#dc2626" stroke-width="4"/><text x="268" y="255" font-size="10" font-weight="700">H. ventrikel</text></g>
      <g data-model-part="Venstre atrium" class="model-part"><path d="M465 170 C465 120 410 95 360 110 C410 130 440 155 465 170Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="4"/><text x="405" y="138" font-size="10" font-weight="700">V. atrium</text></g>
      <g data-model-part="Venstre ventrikel" class="model-part"><path d="M465 170 C480 220 465 300 410 330 C440 260 455 210 465 170Z" fill="#93c5fd" stroke="#2563eb" stroke-width="4"/><text x="432" y="255" font-size="10" font-weight="700">V. ventrikel</text></g>
      <g data-model-part="Aorta" class="model-part"><path d="M410 95 C430 60 470 45 510 55" fill="none" stroke="#dc2626" stroke-width="8"/><text x="515" y="58" font-size="11" font-weight="700">Aorta</text></g>
      <g data-model-part="Lungearterie" class="model-part"><path d="M310 95 C290 60 250 45 210 55" fill="none" stroke="#2563eb" stroke-width="8"/><text x="165" y="58" font-size="10" font-weight="700">Lungeart.</text></g>
      <g data-model-part="Blodflow" class="model-part"><text x="360" y="365" text-anchor="middle" font-size="12" font-weight="700" fill="#64748b">Lille kredsløb ↔ Stort kredsløb</text></g>`,
  },
  photosynthesis: {
    name: 'Fotosyntese', icon: '☀',
    svg: `
      <g data-model-part="Solenergi" class="model-part"><circle cx="120" cy="95" r="42" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="120" y="100" text-anchor="middle" font-size="12" font-weight="700">Sol</text></g>
      <g data-model-part="Kloroplast" class="model-part"><ellipse cx="360" cy="220" rx="150" ry="95" fill="#bbf7d0" stroke="#15803d" stroke-width="5"/><text x="360" y="215" text-anchor="middle" font-size="14" font-weight="700">Kloroplast</text><text x="360" y="235" text-anchor="middle" font-size="11">Stroma · Thylakoid</text></g>
      <g data-model-part="CO₂" class="model-part"><rect x="70" y="300" width="90" height="48" rx="12" fill="#e2e8f0" stroke="#475569" stroke-width="4"/><text x="115" y="330" text-anchor="middle" font-size="14" font-weight="700">CO₂</text></g>
      <g data-model-part="H₂O" class="model-part"><rect x="190" y="300" width="90" height="48" rx="12" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text x="235" y="330" text-anchor="middle" font-size="14" font-weight="700">H₂O</text></g>
      <g data-model-part="Glukose" class="model-part"><rect x="440" y="300" width="100" height="48" rx="12" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="490" y="330" text-anchor="middle" font-size="13" font-weight="700">Glukose</text></g>
      <g data-model-part="O₂" class="model-part"><rect x="570" y="300" width="90" height="48" rx="12" fill="#fecaca" stroke="#dc2626" stroke-width="4"/><text x="615" y="330" text-anchor="middle" font-size="14" font-weight="700">O₂</text></g>
      <g data-model-part="Lysreaktion" class="model-part"><text x="300" y="175" font-size="11" font-weight="700" fill="#166534">Lysreaktion</text></g>
      <g data-model-part="Calvin-cyklus" class="model-part"><text x="420" y="255" font-size="11" font-weight="700" fill="#166534">Calvin-cyklus</text></g>`,
  },
  waveModel: {
    name: 'Bølge og oscillation', icon: '〜',
    svg: `
      <g data-model-part="Bølge" class="model-part"><path d="M80 220 C140 120 220 320 300 220 S460 120 540 220 S620 320 700 220" fill="none" stroke="#2563eb" stroke-width="6"/></g>
      <g data-model-part="Amplitude" class="model-part"><line x1="300" y1="220" x2="300" y2="120" stroke="#dc2626" stroke-width="4" stroke-dasharray="8 6"/><text x="310" y="165" font-size="13" font-weight="700" fill="#b91c1c">A</text></g>
      <g data-model-part="Bølgelængde" class="model-part"><line x1="220" y1="340" x2="380" y2="340" stroke="#15803d" stroke-width="4"/><text x="285" y="360" text-anchor="middle" font-size="13" font-weight="700" fill="#166534">λ</text></g>
      <g data-model-part="Node" class="model-part"><circle cx="220" cy="220" r="8" fill="#64748b"/><text x="220" y="250" text-anchor="middle" font-size="11">Node</text></g>
      <g data-model-part="Antinode" class="model-part"><circle cx="300" cy="120" r="8" fill="#64748b"/><text x="300" y="105" text-anchor="middle" font-size="11">Antinode</text></g>
      <g data-model-part="Frekvens" class="model-part"><text x="560" y="90" font-size="14" font-weight="700" fill="#334155">f = 1/T</text></g>`,
  },
  swotBoard: {
    name: 'SWOT-tavle', icon: 'SW',
    svg: `
      <g data-model-part="Styrker" class="model-part"><rect x="95" y="70" width="230" height="145" rx="16" fill="#bbf7d0" stroke="#15803d" stroke-width="5"/><text x="210" y="110" text-anchor="middle" font-size="18" font-weight="700">Styrker</text><text x="210" y="140" text-anchor="middle" font-size="12">intern +</text></g>
      <g data-model-part="Svagheder" class="model-part"><rect x="395" y="70" width="230" height="145" rx="16" fill="#fecaca" stroke="#dc2626" stroke-width="5"/><text x="510" y="110" text-anchor="middle" font-size="18" font-weight="700">Svagheder</text><text x="510" y="140" text-anchor="middle" font-size="12">intern −</text></g>
      <g data-model-part="Muligheder" class="model-part"><rect x="95" y="240" width="230" height="145" rx="16" fill="#dbeafe" stroke="#2563eb" stroke-width="5"/><text x="210" y="280" text-anchor="middle" font-size="18" font-weight="700">Muligheder</text><text x="210" y="310" text-anchor="middle" font-size="12">ekstern +</text></g>
      <g data-model-part="Trusler" class="model-part"><rect x="395" y="240" width="230" height="145" rx="16" fill="#fde68a" stroke="#b45309" stroke-width="5"/><text x="510" y="280" text-anchor="middle" font-size="18" font-weight="700">Trusler</text><text x="510" y="310" text-anchor="middle" font-size="12">ekstern −</text></g>`,
  },
  musicStructure: {
    name: 'Musikform', icon: '♪',
    svg: `
      <g data-model-part="Introduktion" class="model-part"><rect x="70" y="170" width="100" height="70" rx="12" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text x="120" y="205" text-anchor="middle" font-size="12" font-weight="700">Intro</text></g>
      <g data-model-part="Tema A" class="model-part"><rect x="200" y="170" width="110" height="70" rx="12" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="255" y="205" text-anchor="middle" font-size="14" font-weight="700">A</text></g>
      <g data-model-part="Tema B" class="model-part"><rect x="340" y="170" width="110" height="70" rx="12" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="395" y="205" text-anchor="middle" font-size="14" font-weight="700">B</text></g>
      <g data-model-part="Tema A gentaget" class="model-part"><rect x="480" y="170" width="110" height="70" rx="12" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="535" y="200" text-anchor="middle" font-size="12" font-weight="700">A'</text><text x="535" y="218" text-anchor="middle" font-size="10">gentagelse</text></g>
      <g data-model-part="Koda" class="model-part"><rect x="620" y="170" width="90" height="70" rx="12" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="665" y="205" text-anchor="middle" font-size="12" font-weight="700">Koda</text></g>
      <g data-model-part="Formforløb" class="model-part"><path d="M170 205 H200 M310 205 H340 M450 205 H480 M590 205 H620" stroke="#64748b" stroke-width="5"/></g>`,
  },
  experimentFlow: {
    name: 'Eksperimentforløb', icon: '⚗',
    svg: `
      <g data-model-part="Hypotese" class="model-part"><rect x="285" y="45" width="150" height="54" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text x="360" y="78" text-anchor="middle" font-size="13" font-weight="700">Hypotese</text></g>
      <g data-model-part="Uafhængig variabel" class="model-part"><rect x="95" y="165" width="150" height="54" rx="14" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="170" y="190" text-anchor="middle" font-size="11" font-weight="700">UV · manipulation</text></g>
      <g data-model-part="Kontrolgruppe" class="model-part"><rect x="285" y="165" width="150" height="54" rx="14" fill="#e2e8f0" stroke="#475569" stroke-width="4"/><text x="360" y="198" text-anchor="middle" font-size="12" font-weight="700">Kontrol</text></g>
      <g data-model-part="Afhængig variabel" class="model-part"><rect x="475" y="165" width="150" height="54" rx="14" fill="#fbcfe8" stroke="#be185d" stroke-width="4"/><text x="550" y="190" text-anchor="middle" font-size="11" font-weight="700">DV · måling</text></g>
      <g data-model-part="Dataindsamling" class="model-part"><rect x="200" y="285" width="140" height="54" rx="14" fill="#c4b5fd" stroke="#6d28d9" stroke-width="4"/><text x="270" y="318" text-anchor="middle" font-size="12" font-weight="700">Data</text></g>
      <g data-model-part="Konklusion" class="model-part"><rect x="380" y="285" width="140" height="54" rx="14" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="450" y="318" text-anchor="middle" font-size="12" font-weight="700">Konklusion</text></g>
      <g data-model-part="Flow" class="model-part"><path d="M360 99 V165 M170 219 H285 M435 192 H475 M360 219 V285 H270 M340 312 H380" stroke="#64748b" stroke-width="5"/></g>`,
  },
  vennDiagram: {
    name: 'Venn-diagram', icon: '∩',
    svg: `
      <g data-model-part="Mængde A" class="model-part"><circle cx="290" cy="220" r="95" fill="#dbeafe" stroke="#2563eb" stroke-width="5" opacity=".85"/><text x="230" y="215" font-size="16" font-weight="700">A</text></g>
      <g data-model-part="Mængde B" class="model-part"><circle cx="430" cy="220" r="95" fill="#fde68a" stroke="#b45309" stroke-width="5" opacity=".85"/><text x="490" y="215" font-size="16" font-weight="700">B</text></g>
      <g data-model-part="Mængde C" class="model-part"><circle cx="360" cy="310" r="95" fill="#bbf7d0" stroke="#15803d" stroke-width="5" opacity=".85"/><text x="360" y="370" text-anchor="middle" font-size="16" font-weight="700">C</text></g>
      <g data-model-part="Snit A∩B" class="model-part"><text x="360" y="205" text-anchor="middle" font-size="12" font-weight="700">A∩B</text></g>
      <g data-model-part="Fællesmængde" class="model-part"><text x="360" y="255" text-anchor="middle" font-size="11" font-weight="700">A∩B∩C</text></g>`,
  },
  foodChain: {
    name: 'Fødekæde', icon: '→',
    svg: `
      <g data-model-part="Producenter" class="model-part"><rect x="60" y="185" width="120" height="58" rx="14" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="120" y="210" text-anchor="middle" font-size="12" font-weight="700">Producenter</text><text x="120" y="228" text-anchor="middle" font-size="10">planter</text></g>
      <g data-model-part="Primærforbrugere" class="model-part"><rect x="220" y="185" width="120" height="58" rx="14" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="280" y="210" text-anchor="middle" font-size="11" font-weight="700">Primærforbr.</text><text x="280" y="228" text-anchor="middle" font-size="10">herbivorer</text></g>
      <g data-model-part="Sekundærforbrugere" class="model-part"><rect x="380" y="185" width="120" height="58" rx="14" fill="#fbcfe8" stroke="#be185d" stroke-width="4"/><text x="440" y="210" text-anchor="middle" font-size="11" font-weight="700">Sekundærforbr.</text><text x="440" y="228" text-anchor="middle" font-size="10">rovdyr</text></g>
      <g data-model-part="Nedbrydere" class="model-part"><rect x="540" y="185" width="120" height="58" rx="14" fill="#e2e8f0" stroke="#475569" stroke-width="4"/><text x="600" y="210" text-anchor="middle" font-size="12" font-weight="700">Nedbrydere</text></g>
      <g data-model-part="Energiflow" class="model-part"><path d="M180 214 H220 M340 214 H380 M500 214 H540" stroke="#64748b" stroke-width="6" marker-end="url(#arrow)"/><text x="360" y="310" text-anchor="middle" font-size="12" font-weight="700" fill="#64748b">Energi og næringsstoffer</text></g>`,
  },
  neuralNetwork: {
    name: 'Neuralt netværk', icon: 'NN',
    svg: `
      <g data-model-part="Input-lag" class="model-part"><rect x="70" y="120" width="110" height="180" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/><text x="125" y="108" text-anchor="middle" font-size="12" font-weight="700">Input</text>${[0,1,2,3].map(i => `<circle cx="125" cy="${155+i*40}" r="14" fill="#93c5fd" stroke="#1d4ed8" stroke-width="3"/>`).join('')}</g>
      <g data-model-part="Skjult lag" class="model-part"><rect x="305" y="95" width="110" height="230" rx="14" fill="#fde68a" stroke="#b45309" stroke-width="4"/><text x="360" y="83" text-anchor="middle" font-size="12" font-weight="700">Skjult</text>${[0,1,2,3,4].map(i => `<circle cx="360" cy="${130+i*38}" r="14" fill="#fcd34d" stroke="#b45309" stroke-width="3"/>`).join('')}</g>
      <g data-model-part="Output-lag" class="model-part"><rect x="540" y="145" width="110" height="130" rx="14" fill="#bbf7d0" stroke="#15803d" stroke-width="4"/><text x="595" y="133" text-anchor="middle" font-size="12" font-weight="700">Output</text>${[0,1,2].map(i => `<circle cx="595" cy="${175+i*40}" r="14" fill="#86efac" stroke="#15803d" stroke-width="3"/>`).join('')}</g>
      <g data-model-part="Vægte" class="model-part"><path d="M180 155 H305 M180 195 H305 M180 235 H305 M180 275 H305 M415 130 H540 M415 170 H540 M415 210 H540" stroke="#94a3b8" stroke-width="2" opacity=".7"/></g>`,
  },
  stakeholderMap: { name: 'Interessentkort', icon: '◎', svg: conceptModelSvg('Projekt', ['Interessent A', 'Interessent B', 'Magt', 'Indflydelse', 'Strategi']) },
  custom: {
    name: 'Design selv', icon: '+',
    svg: `<g data-model-part="Din model" class="model-part"><rect x="115" y="75" width="490" height="285" rx="28" fill="#faf7f2" stroke="#9b8e80" stroke-width="5" stroke-dasharray="14 9"/><text x="360" y="205" text-anchor="middle" font-size="30" fill="#75695d">Din model</text><text x="360" y="245" text-anchor="middle" font-size="17" fill="#9a8e82">Farvelæg, sæt pins og giv delene noter</text></g>`,
  },
};

const UNIVERSITY_TOOL_FIGURE = {
  anatomy: 'heartModel', patientCase: 'heartModel', clinicalReasoning: 'heartModel', diagnostics: 'heartModel',
  caseSeries: 'heartModel', carePlan: 'experimentFlow', clinicalPathway: 'timeline', dosage: 'molecule',
  pharmacology: 'molecule', drugInteraction: 'molecule', evidence: 'researchDesign', epidemiology: 'functionGraph',
  biostatistics: 'probability', labReport: 'experimentFlow', circuit: 'circuit', mechanics: 'mechanics',
  integral: 'calculus', derivative: 'calculus', physics: 'mechanics', angles: 'geometry', geometry: 'geometry',
  algebra: 'functionGraph', calculus: 'calculus', linearAlgebra: 'matrixMap', matrix: 'matrixMap',
  differentialEquations: 'functionGraph', analysis: 'functionGraph', complexAnalysis: 'functionGraph',
  probability: 'probability', statistics: 'probability', numericalMethods: 'functionGraph', optimization: 'functionGraph',
  topology: 'vennDiagram', discreteMath: 'dataStructure', numberTheory: 'matrixMap', logic: 'philosophy',
  quantumMechanics: 'waveModel', quantumPhysics: 'waveModel', epsilonDelta: 'calculus', summation: 'functionGraph',
  hypothesisTest: 'probability', metaAnalysis: 'researchDesign', regression: 'functionGraph', forecasting: 'functionGraph',
  econometrics: 'economics', finance: 'accounting', valuation: 'accounting',
  swot: 'swotBoard', demandSupply: 'economics', accounting: 'accounting', gameTheory: 'economics', riskAnalysis: 'swotBoard',
  sourceAnalysis: 'sourceAnalysis', argument: 'law', debateMap: 'law', closeReading: 'language', hermeneutics: 'language',
  discourse: 'sourceAnalysis', theoryCompare: 'vennDiagram', qualitativeCoding: 'sourceAnalysis', bibliography: 'sourceAnalysis',
  citationMap: 'sourceAnalysis', archive: 'sourceAnalysis', researchQuestion: 'researchDesign', literatureReview: 'timeline',
  timeline: 'timeline', interview: 'stakeholderMap', survey: 'stakeholderMap', caseStudy: 'society',
  networkAnalysis: 'network', comparativeMethod: 'vennDiagram', ethics: 'law', focusGroup: 'stakeholderMap',
  observationalStudy: 'experimentFlow', policyBrief: 'law', userStory: 'softwareArchitecture', apiDesign: 'softwareArchitecture',
  sprintPlanning: 'softwareArchitecture', conceptMap: 'dataStructure', peerReview: 'philosophy', reflectionLog: 'learningCycle',
  systematicReview: 'researchDesign', experimentDesign: 'experimentFlow', psychometrics: 'maslow', theoryApply: 'learningCycle',
  brainMap: 'brain', memoryModel: 'memoryModel', cognition: 'cognition', robotFlow: 'robot',
  algorithm: 'algorithmFlow', code: 'algorithmFlow', python: 'algorithmFlow', javascript: 'algorithmFlow',
  java: 'algorithmFlow', cpp: 'algorithmFlow', go: 'algorithmFlow', rust: 'algorithmFlow', sql: 'database',
  web: 'softwareArchitecture', matlab: 'functionGraph', arduino: 'circuit', ros: 'network', debug: 'algorithmFlow',
  libraries: 'database', siUnits: 'mechanics', calculator: 'functionGraph',
  vocabulary: 'language', grammar: 'language', translation: 'rhetoric', phonetics: 'language', syntax: 'language',
  semantics: 'language', pragmatics: 'language', corpus: 'sourceAnalysis',
  legislation: 'law', caseLaw: 'law', legalMethod: 'law', precedent: 'law', contract: 'law', euLaw: 'law',
  humanRights: 'law', legalCitation: 'law', legalIssue: 'law', caseComparison: 'law',
  formAnalysis: 'musicStructure', composition: 'musicStructure', audioNotes: 'musicStructure', counterpoint: 'musicStructure',
  orchestration: 'musicStructure', notation: 'musicStructure', harmony: 'musicStructure', rhythm: 'musicStructure',
  chords: 'musicStructure', earTraining: 'musicStructure', songAnalysis: 'musicStructure',
  quote: 'rhetoric', table: 'stakeholderMap', researchDesign: 'researchDesign',
};

const LAYOUT_FIGURE_DEFAULTS = {
  quadrant: 'swotBoard', matrix: 'economics', pipeline: 'timeline', timeline: 'timeline', debate: 'law',
  network: 'network', legal: 'law', music: 'musicStructure', coding: 'algorithmFlow', experiment: 'experimentFlow',
  case: 'heartModel', math: 'functionGraph', reading: 'language', source: 'sourceAnalysis', vocab: 'language',
  quote: 'rhetoric', review: 'philosophy', reflection: 'learningCycle', columns: 'vennDiagram', cards: 'dataStructure',
  survey: 'stakeholderMap', evidence: 'researchDesign',
};

const PACK_FIGURE_DEFAULTS = {
  health: 'heartModel', psychology: 'brain', stem: 'functionGraph', coding: 'algorithmFlow', general: 'researchDesign',
};

function resolveUniversityToolFigureKey(tool, packId, layout) {
  const fromFig = figureToolTemplates[tool];
  if (fromFig && modelTemplates[fromFig]) return fromFig;
  const fromTool = UNIVERSITY_TOOL_FIGURE[tool];
  if (fromTool && modelTemplates[fromTool]) return fromTool;
  const fromLayout = LAYOUT_FIGURE_DEFAULTS[layout];
  if (fromLayout && modelTemplates[fromLayout]) return fromLayout;
  const fromPack = PACK_FIGURE_DEFAULTS[packId];
  if (fromPack && modelTemplates[fromPack]) return fromPack;
  return null;
}

function universityToolFigurePanelHtml(tool, packId, sections, title) {
  const ui = getUniversityToolUi(tool, packId);
  const layout = ui.layout || 'enhanced';
  const key = resolveUniversityToolFigureKey(tool, packId, layout);
  let svgContent;
  let caption;
  if (key && modelTemplates[key]) {
    svgContent = modelTemplates[key].svg;
    caption = modelTemplates[key].name;
  } else {
    const labels = (sections || []).slice(0, 5).map(section => String(section).slice(0, 16));
    caption = String(title || tool || 'Emne').slice(0, 24);
    svgContent = conceptModelSvg(caption.slice(0, 18), labels.length >= 2 ? labels : ['Del 1', 'Del 2', 'Del 3', 'Del 4', 'Del 5']);
  }
  return `<div class="university-tool-figure-panel">
    <svg class="university-tool-figure" viewBox="0 0 720 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(caption)}">${svgContent}</svg>
    <span class="university-tool-figure-caption">${escapeHtml(caption)}</span>
  </div>`;
}

const modelCategories = [
  { id: 'biology', label: 'Biologi og sundhed', models: ['cell','brain','dna','ecosystem','anatomy','molecule','protein','immune','heartModel','photosynthesis','foodChain'] },
  { id: 'psychology', label: 'Psykologi og neuro', models: ['brain','memoryModel','cognition','maslow','learningCycle','stressModel','experimentFlow'] },
  { id: 'math', label: 'Matematik og fysik', models: ['geometry','mechanics','functionGraph','probability','matrixMap','calculus','waveModel','vennDiagram'] },
  { id: 'computer', label: 'Computer science og IT', models: ['dataStructure','network','algorithmFlow','robotFlow','database','cybersecurity','softwareArchitecture','neuralNetwork'] },
  { id: 'engineering', label: 'Ingeniør og teknologi', models: ['robot','circuit','controlSystem','waveModel','mechanics'] },
  { id: 'custom', label: 'Design selv', models: ['custom'] },
];
const modelCategoryOpen = {};

let modelState = { template: 'geometry', mode: 'paint', color: modelColors[0], colors: {}, pins: [], selectedPart: '', pending: null };

function inferredModelTemplate() {
  const type = activePage()?.docType || 'general';
  const subject = (activeSubject()?.name || '').toLowerCase();
  if (/hjerne|neuro|psykologi|kognit|adfærd/.test(subject) || type === 'psychology') return 'brain';
  if (/hukommelse|memory/.test(subject)) return 'memoryModel';
  if (/bio|celle|molekyl|kemi|chem/.test(subject)) return /celle|bio/.test(subject) ? 'cell' : 'molecule';
  if (/computer|datalogi|algorit|programmer|software|data structure/.test(subject) || type === 'tech') return 'robotFlow';
  if (/netværk|network|arkitektur|cloud/.test(subject)) return 'network';
  if (/robot|ros|mekatron/.test(subject)) return 'robot';
  if (/elektr|arduino|esp|kredsløb|circuit/.test(subject) || type === 'engineering') return 'circuit';
  if (/mekanik|dynamik|statik|fysik/.test(subject) || type === 'physics') return 'mechanics';
  if (type === 'chemistry') return 'molecule';
  return 'geometry';
}

function openModelDialog() {
  captureEditorRange();
  modelState = { template: inferredModelTemplate(), mode: 'paint', color: modelColors[0], colors: {}, pins: [], selectedPart: '', pending: null };
  renderModelDialog();
  $('#modelDialog')?.showModal();
}

function renderModelDialog() {
  const templates = $('#modelTemplates');
  if (!templates) return;
  templates.innerHTML = modelCategories.map((category, index) => {
    const open = modelCategoryOpen[category.id] === true;
    return `<section class="model-category ${open ? 'open' : ''}">
      <button type="button" class="model-category-toggle" data-model-category="${category.id}"><span>${open ? '−' : '+'}</span><b>${escapeHtml(category.label)}</b><small>${category.models.length}</small></button>
      <div class="model-category-items">${category.models.map(id => {
        const item = modelTemplates[id];
        return `<button type="button" class="model-template-btn ${id === modelState.template ? 'active' : ''}" data-model-template="${id}"><span class="model-template-icon">${item.icon}</span><span>${escapeHtml(item.name)}</span></button>`;
      }).join('')}</div>
    </section>`;
  }).join('');
  $('#modelPalette').innerHTML = modelColors.map(color => `<button type="button" class="model-color ${color === modelState.color ? 'active' : ''}" data-model-color="${color}" style="background:${color}" title="${color}"></button>`).join('');
  document.querySelectorAll('[data-model-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.modelMode === modelState.mode));
  renderModelStage();
  renderModelPinList();
}

function renderModelStage() {
  const stage = $('#modelStage');
  if (!stage) return;
  stage.innerHTML = `<rect width="720" height="430" fill="#fff"/>${modelTemplates[modelState.template].svg}<g id="modelPinLayer"></g>`;
  Object.entries(modelState.colors).forEach(([part, color]) => paintModelPart(part, color, false));
  stage.querySelectorAll('.model-part').forEach(el => el.classList.toggle('selected', el.dataset.modelPart === modelState.selectedPart));
  const layer = stage.querySelector('#modelPinLayer');
  const pins = modelState.pending ? [...modelState.pins, { ...modelState.pending, text: 'Ny note', draft: true }] : modelState.pins;
  layer.innerHTML = pins.map((pin, i) => {
    const right = pin.x < 455;
    const labelX = right ? Math.min(pin.x + 75, 500) : Math.max(pin.x - 245, 20);
    const labelY = Math.max(20, Math.min(pin.y - 36, 355));
    const lineX = right ? labelX : labelX + 200;
    return `<g opacity="${pin.draft ? '.65' : '1'}">
      <line class="model-pin-line" x1="${pin.x}" y1="${pin.y}" x2="${lineX}" y2="${labelY + 26}"/>
      <circle class="model-pin-dot" cx="${pin.x}" cy="${pin.y}" r="13"/>
      <text class="model-pin-number" x="${pin.x}" y="${pin.y + 4}" text-anchor="middle">${pin.draft ? '+' : i + 1}</text>
      <rect class="model-pin-label" x="${labelX}" y="${labelY}" width="200" height="52" rx="8"/>
      <text class="model-pin-text" x="${labelX + 10}" y="${labelY + 21}">${escapeHtml((pin.part || 'Modeldel').slice(0, 25))}</text>
      <text class="model-pin-text" x="${labelX + 10}" y="${labelY + 39}" font-weight="400">${escapeHtml((pin.text || '').slice(0, 31))}</text>
    </g>`;
  }).join('');
}

function paintModelPart(part, color, remember = true) {
  const group = [...($('#modelStage')?.querySelectorAll('[data-model-part]') || [])].find(el => el.dataset.modelPart === part);
  if (!group) return;
  if (remember) modelState.colors[part] = color;
  [group, ...group.querySelectorAll('*')].forEach(el => {
    if (el.tagName === 'text') return;
    const fill = el.getAttribute('fill');
    const stroke = el.getAttribute('stroke');
    if (fill && fill !== 'none') el.setAttribute('fill', color);
    if ((!fill || fill === 'none') && stroke && stroke !== 'none') el.setAttribute('stroke', color);
  });
}

function modelPoint(event) {
  const stage = $('#modelStage');
  const rect = stage.getBoundingClientRect();
  return { x: Math.round((event.clientX - rect.left) * 720 / rect.width), y: Math.round((event.clientY - rect.top) * 430 / rect.height) };
}

function selectModelPart(part) {
  modelState.selectedPart = part || 'Model';
  const selected = $('#modelSelectedPart');
  if (selected) selected.textContent = modelState.selectedPart;
}

function renderModelPinList() {
  const list = $('#modelPinList');
  if (!list) return;
  list.innerHTML = modelState.pins.length ? modelState.pins.map((pin, i) => `
    <div class="model-pin-card"><button type="button" data-delete-model-pin="${i}">×</button><b>${i + 1}. ${escapeHtml(pin.part)}</b>${escapeHtml(pin.text)}</div>`).join('') : '<p class="model-help">Klik “Notepunkt”, vælg en del og skriv din note.</p>';
}

function insertInteractiveModel() {
  const stage = $('#modelStage');
  const ed = $('#editor');
  if (!stage || !ed) return;
  const clone = stage.cloneNode(true);
  clone.removeAttribute('id');
  clone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  const notes = modelState.pins.length
    ? `<ol class="embedded-model-notes">${modelState.pins.map(pin => `<li><b>${escapeHtml(pin.part)}:</b> ${escapeHtml(pin.text)}</li>`).join('')}</ol>`
    : '';
  const html = `<figure class="embedded-model" contenteditable="false">${clone.outerHTML}<figcaption>${escapeHtml(modelTemplates[modelState.template].name)} · farvelagt og annoteret i Note'it</figcaption>${notes}</figure><p><br></p>`;
  const rangeIsValid = editorRange && ed.contains(editorRange.commonAncestorContainer);
  if (rangeIsValid) {
    editorRange.deleteContents();
    const fragment = editorRange.createContextualFragment(html);
    editorRange.insertNode(fragment);
  } else {
    ed.insertAdjacentHTML('beforeend', html);
  }
  ed.dispatchEvent(new Event('input'));
  $('#modelDialog')?.close();
}

let drawing = false, drawStart = null, drawSnapshot = null;

function resetDrawing() {
  const c = $('#drawingCanvas'), ctx = c?.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for (let x = 0; x < c.width; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
  for (let y = 0; y < c.height; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
}

function initDrawing() {
  const c = $('#drawingCanvas');
  if (!c || c.dataset.bound) return;
  c.dataset.bound = '1';
  c.addEventListener('pointerdown', e => {
    e.preventDefault();
    drawing = true;
    const r = c.getBoundingClientRect();
    drawStart = { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height };
    drawSnapshot = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    c.setPointerCapture(e.pointerId);
  });
  c.addEventListener('pointermove', e => {
    if (!drawing) return;
    e.preventDefault();
    const r = c.getBoundingClientRect(), ctx = c.getContext('2d');
    const pt = { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height };
    ctx.putImageData(drawSnapshot, 0, 0);
    ctx.strokeStyle = $('#drawColor')?.value || '#111827';
    const baseWidth = Number($('#drawWidth')?.value || 2);
    const pressure = Math.max(.25, Math.min(1, e.pressure || (e.pointerType === 'pen' ? .55 : .45)));
    ctx.lineWidth = e.pointerType === 'pen' ? Math.max(1, baseWidth * (.7 + pressure)) : baseWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(drawStart.x, drawStart.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    drawStart = pt;
    drawSnapshot = ctx.getImageData(0, 0, c.width, c.height);
  });
  c.addEventListener('pointerup', () => { drawing = false; });
  $('#clearDrawing')?.addEventListener('click', resetDrawing);
  $('#insertDrawing')?.addEventListener('click', () => {
    const src = c.toDataURL('image/png');
    $('#drawingDialog').close();
    setTimeout(() => insertHtml(`<figure style="margin:16px 0"><img src="${src}" style="max-width:100%;border:1px solid #e5e7eb;border-radius:6px"></figure><p><br></p>`), 50);
  });
}

function evaluateAtX(raw, x) {
  const source = String(raw || '').toLowerCase().replace(/\s+/g, '');
  const tokens = source.match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-z]+|[()+\-*/^]/g) || [];
  if (tokens.join('') !== source) throw new Error('Udtrykket indeholder tegn, som grafplotteren ikke understøtter.');
  let index = 0;
  const functions = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, log: Math.log10, ln: Math.log, abs: Math.abs };
  const primary = () => {
    const token = tokens[index++];
    if (token === '(') {
      const value = expression();
      if (tokens[index++] !== ')') throw new Error('Der mangler en slutparentes.');
      return value;
    }
    if (token === '-') return -primary();
    if (token === '+') return primary();
    if (token === 'x') return x;
    if (token === 'pi') return Math.PI;
    if (token === 'e') return Math.E;
    if (functions[token]) {
      if (tokens[index++] !== '(') throw new Error(`Skriv ${token}(...)`);
      const value = expression();
      if (tokens[index++] !== ')') throw new Error('Der mangler en slutparentes.');
      return functions[token](value);
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error(`Ukendt symbol: ${token || 'slutningen af udtrykket'}`);
    return value;
  };
  const power = () => {
    let value = primary();
    if (tokens[index] === '^') {
      index += 1;
      value **= power();
    }
    return value;
  };
  const term = () => {
    let value = power();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++];
      const right = power();
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };
  const expression = () => {
    let value = term();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      const right = term();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };
  const result = expression();
  if (index !== tokens.length) throw new Error(`Uventet symbol: ${tokens[index]}`);
  return result;
}

function plotFunction() {
  const gc = $('#graphCanvas'), ctx = gc?.getContext('2d');
  if (!ctx) return;
  const range = Number($('#graphRange')?.value || 10), expr = $('#graphExpression')?.value || 'x';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, gc.width, gc.height);
  ctx.strokeStyle = '#e5e7eb';
  for (let x = 0; x <= gc.width; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, gc.height); ctx.stroke(); }
  const xToP = x => (x + range) / (2 * range) * gc.width;
  const yToP = y => gc.height / 2 - y * (gc.height / (2 * range));
  ctx.strokeStyle = '#6b7280';
  ctx.beginPath(); ctx.moveTo(0, gc.height / 2); ctx.lineTo(gc.width, gc.height / 2); ctx.stroke();
  ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2.5; ctx.beginPath();
  let started = false;
  for (let px = 0; px <= gc.width; px++) {
    const x = px / gc.width * 2 * range - range;
    try {
      const y = evaluateAtX(expr, x), py = yToP(y);
      if (!Number.isFinite(y)) { started = false; continue; }
      if (!started) { ctx.moveTo(xToP(x), py); started = true; } else ctx.lineTo(xToP(x), py);
    } catch { started = false; }
  }
  ctx.stroke();
}

function saveExamData() {
  ensureExamDataShape();
  const serialized = JSON.stringify(examData);
  localStorage.setItem('stemnotes-exams', serialized);
  const email = activeAccountEmail();
  if (email) localStorage.setItem(accountStorageKey(email, 'exams'), serialized);
  if (isGuest()) showGuestSaveNotice();
}
function dayKey(d) { return d.toISOString().slice(0, 10); }

function renderExamSubjects() {
  $('#planStart').value = examData.start || dayKey(new Date());
  const count = examData.subjects.length;
  $('#examSubjects').innerHTML = `<div class="exam-subjects-head"><div><strong>${count ? `${count} eksamensfag` : 'Ingen fag endnu'}</strong><small>Hvert fag får sin egen plan, materialer og træning.</small></div><button type="button" class="btn-outline compact" data-add-exam-subject>+ Tilføj fag</button></div>` + (count
    ? examData.subjects.map((s, index) => `<div class="exam-subject">
        <header><strong>${escapeHtml(s.name)}</strong><button type="button" class="page-delete" data-remove-exam="${s.id}">×</button></header>
        <p><b>Eksamen:</b> ${formatDate(s.date + 'T12:00:00')}${s.reexamDate ? ` · <b>Reeksamen:</b> ${formatDate(s.reexamDate + 'T12:00:00')}` : ''}</p>
        <div class="exam-source-tags"><span>${s.source === 'files' ? 'Uploadet litteratur' : s.source === 'both' ? 'Noter + litteratur' : 'Dine noter'}</span><span>${s.topics.length} emner</span>${s.files?.length ? `<span>${s.files.length} PDF-filer</span>` : ''}${s.questions?.length ? `<span>${s.questions.length} eksamensspørgsmål</span>` : ''}</div>
        ${s.files?.length ? `<div class="exam-file-list">${s.files.map(file => `<span>${escapeHtml(file.name)}</span>`).join('')}</div>` : ''}
        <small class="exam-subject-number">Fag ${index + 1}</small>
      </div>`).join('') + `<button type="button" class="exam-add-another" data-add-exam-subject>+ Tilføj endnu et fag</button>`
    : '<div class="empty-list">Tilføj dit første fag. Du kan bagefter tilføje lige så mange fag, du har brug for.</div>');
}

function renderExamPrepSubjects() {
  const host = $('#examPrepSubjects');
  if (!host) return;
  if (!examData.plan?.length) {
    host.innerHTML = `<div class="exam-plan-required"><span>▦</span><div><b>Lav eksamensplanen først</b><p>Træningen bruger fag, pensum, noter og spørgsmål fra din plan.</p></div><button type="button" class="btn-primary" data-go-exam-plan>Åbn eksamensplan</button></div>`;
    return;
  }
  host.innerHTML = examData.subjects.map(subject => {
    const noteSubject = data.subjects.find(item => item.id === subject.subjectId);
    const noteCount = noteSubject ? data.pages.filter(page => page.subjectId === noteSubject.id).length : 0;
    const tasks = (examData.plan || []).flatMap(day => day.tasks || []).filter(task => task.subject === subject.name);
    const completed = tasks.filter(task => examData.checks[task.id]).length;
    const nextTask = (examData.plan || []).flatMap(day => (day.tasks || []).map(task => ({ ...task, date: day.date })))
      .find(task => task.subject === subject.name && !examData.checks[task.id]);
    return `<label><input type="checkbox" value="${subject.id}" checked><span><b>${escapeHtml(subject.name)}</b><small>${subject.topics.length} pensumemner · ${noteCount} noter · ${completed}/${tasks.length} læst</small>${nextTask ? `<em>Næste fra planen: ${formatDate(`${nextTask.date}T12:00:00`)} · ${escapeHtml(nextTask.topic)}</em>` : '<em>Planens opgaver er gennemført.</em>'}</span></label>`;
  }).join('');
}

async function generateExamGuide(mode) {
  const host = getExamQuizHost();
  if (!host) return;
  const draft = examData.synopsisDrafts?.default || {};
  const hasDraft = mode === 'synopsis' && Object.values(draft).some(value => String(value || '').trim());
  if (!examData.plan?.length && !hasDraft) {
    host.innerHTML = `<div class="exam-plan-required"><span>▦</span><div><b>Opret eksamensplanen eller udfyld synopsis-skabelonen</b><p>Vejledningen bruger dine valgte fag, noter, litteratur og synopsis-kladde.</p></div><button type="button" class="btn-primary" data-exam-activity-tab-jump="template">Åbn skabelon</button> <button type="button" class="btn-outline" data-go-exam-plan>Gå til eksamensplan</button></div>`;
    return;
  }
  const checkedIds = [...document.querySelectorAll('#examPrepSubjects input:checked, #examActivitySubjects input:checked, #examSynopsisSubjects input:checked, #examTrainingSubjects input:checked')].map(input => input.value);
  const subjects = examData.subjects.filter(subject => !checkedIds.length || checkedIds.includes(subject.id));
  if (!subjects.length && !(mode === 'synopsis' && hasDraft)) return;
  const modeCopy = {
    synopsis: {
      title: 'Synopsis hjælp',
      instructions: 'Lav en konkret synopsisvejledning med: forslag til problemformulering, 4 til 6 afsnit, relevante metoder, kildebrug, afgrænsning og en afsluttende kvalitetstjekliste. Skeln tydeligt mellem forslag og fakta fra materialet.',
    },
    oral: {
      title: 'Mundtlig eksamen',
      instructions: 'Lav en konkret plan til mundtlig eksamen med: et kort oplæg, disposition i minutter, centrale begreber, sandsynlige uddybende spørgsmål, lovlige eller typiske hjælpemidler som den studerende bør kontrollere i eksamensreglerne, og en tjekliste til eksamensdagen.',
    },
    written: {
      title: 'Skriftlig eksamen',
      instructions: 'Lav en konkret strategi til skriftlig eksamen med: tidsfordeling, læsning af opgaven, dispositionsfase, faglig argumentation, kilde eller formelkontrol, kvalitetstjek og en plan hvis tiden bliver knap.',
    },
  }[mode];
  if (!modeCopy) return;
  const material = subjects.length ? subjects.map(subject => {
    const pages = data.pages.filter(page => page.subjectId === subject.subjectId);
    const notes = pages.map(page => `${page.title}: ${plainNoteText(page)}`).join('\n').slice(0, 5000);
    const literature = (subject.literature || []).map(item => `${item.name}: ${item.text || ''}`).join('\n').slice(0, 3000);
    return `FAG: ${subject.name}\nEKSAMEN: ${subject.date}\nEMNER: ${(subject.topics || []).join(', ')}\nNOTER:\n${notes || '(ingen noter)'}\nLITTERATUR:\n${literature || '(ingen tekst udtrukket)'}`;
  }).join('\n\n---\n\n') : '(ingen eksamensfag valgt – bruger synopsis-kladde)';
  let synopsisExtra = '';
  if (mode === 'synopsis') {
    const draft = examData.synopsisDrafts?.default || {};
    const draftText = Object.entries(draft).filter(([, value]) => String(value || '').trim()).map(([key, value]) => `${key}: ${value}`).join('\n');
    if (draftText) synopsisExtra += `\n\nSYNOPSIS-KLADDE:\n${draftText}`;
    if (examData.synopsisPdf?.text) synopsisExtra += `\n\nUPLOADET PDF (${examData.synopsisPdf.name || 'materiale'}):\n${examData.synopsisPdf.text.slice(0, 8000)}`;
  }
  showAiLoading(host, `Laver ${modeCopy.title.toLowerCase()} ud fra din eksamensplan…`);
  let answer;
  try {
    answer = await requestOpenAI({
      instructions: `Du er en omhyggelig dansk universitetsvejleder. ${modeCopy.instructions} Brug kun det vedlagte materiale til faglige påstande. Når regler om hjælpemidler ikke fremgår, skal du udtrykkeligt bede den studerende kontrollere universitetets officielle eksamensbeskrivelse. Skriv klart, praktisk og uden at kalde vurderinger for facit.`,
      input: material + synopsisExtra,
    });
  } catch {
    if (mode === 'synopsis') {
      const draft = examData.synopsisDrafts?.default || {};
      const sections = [
        ['Problemformulering', draft.problem || 'Formulér et præcist, afgrænset spørgsmål der kan undersøges empirisk eller teoretisk.'],
        ['Formål', draft.purpose || 'Forklar hvad synopsis skal belyse og hvorfor emnet er relevant.'],
        ['Metode', draft.method || 'Vælg metode, materiale og analysestrategi – begrund valget.'],
        ['Hovedpointer', draft.points || 'Byg 4–6 afsnit med tydelig rød tråd fra teori til analyse.'],
        ['Konklusion', draft.conclusion || 'Saml fund, begrænsninger og perspektiv.'],
      ];
      answer = `## Din synopsis-struktur\n\n${sections.map(([title, text]) => `### ${title}\n${text}`).join('\n\n')}\n\n## Kvalitetstjekliste\n1. Er problemformuleringen præcis og afgrænset?\n2. Er teori og metode tydeligt forbundet?\n3. Er kilder korrekt og konsekvent brugt?\n4. Er analysen struktureret i klare afsnit?\n5. Matcher konklusionen problemstillingen?`;
    } else {
      const fallback = mode === 'oral'
        ? ['Kontrollér eksamensregler og hjælpemidler', 'Lav et kort oplæg', 'Vælg tre nøglebegreber', 'Forbered et eksempel', 'Øv kritiske spørgsmål', 'Pak legitimation og tilladte materialer']
        : ['Læs alle delspørgsmål først', 'Fordel tiden', 'Lav en kort disposition', 'Besvar med faglige begreber', 'Kontrollér kilder og beregninger', 'Gem tid til korrektur'];
      answer = fallback.map((item, index) => `${index + 1}. ${item}`).join('\n');
    }
  }
  host.innerHTML = `<section class="exam-guide-result"><header><span>${mode === 'synopsis' ? '¶' : mode === 'oral' ? '◯' : 'Aa'}</span><div><small>BYGGET PÅ DIN EKSAMENSPLAN</small><h3>${modeCopy.title}</h3></div></header><div class="exam-guide-copy">${simpleMarkdownToHtml(answer)}</div><footer><button type="button" class="btn-outline" data-copy-exam-guide>Kopiér vejledningen</button></footer></section>`;
}


function examPaperSubjects() {
  return examData.subjects || [];
}

function recordPaperTrainingSession(preset, subject, itemCount, score = null) {
  examData.paperTrainingHistory ||= [];
  examData.paperTrainingHistory.push({
    id: uid(),
    preset,
    subjectId: subject.id,
    subjectName: subject.name,
    label: paperTrainingLabels[preset] || preset,
    itemCount: Number(itemCount) || 0,
    score,
    date: new Date().toISOString(),
  });
  saveExamData();
}

function getPaperTrainingSets() {
  const history = examData.paperTrainingHistory || [];
  const bySubject = new Map();
  history.forEach(entry => {
    const existing = bySubject.get(entry.subjectId);
    if (!existing) {
      bySubject.set(entry.subjectId, {
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        itemCount: entry.itemCount,
        lastItemCount: entry.itemCount,
        lastPreset: entry.label,
        lastDate: entry.date,
        sessions: 1,
      });
      return;
    }
    existing.sessions += 1;
    existing.itemCount += entry.itemCount;
    if (entry.date > existing.lastDate) {
      existing.lastDate = entry.date;
      existing.lastPreset = entry.label;
      existing.lastItemCount = entry.itemCount;
    }
  });
  return [...bySubject.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

function getPaperTrainingRecentActivity(limit = 3) {
  return (examData.paperTrainingHistory || [])
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

function getPaperTrainingStreak() {
  const days = new Set((examData.paperTrainingHistory || []).map(entry => dayKey(new Date(entry.date))));
  if (!days.size) return 0;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getPaperTrainingTodayGoals() {
  const today = dayKey(new Date());
  const todayEntries = (examData.paperTrainingHistory || []).filter(entry => dayKey(new Date(entry.date)) === today);
  const quizCount = todayEntries.filter(entry => entry.preset === 'quiz').length;
  const flashCount = todayEntries.filter(entry => entry.preset === 'flashcards').length;
  const mockCount = todayEntries.filter(entry => ['mock', 'oral'].includes(entry.preset)).length;
  return { quizCount, flashCount, mockCount, hasActivity: todayEntries.length > 0 };
}

function renderPaperTrainingSubjectBar() {
  const subjects = examData.subjects || [];
  if (!subjects.length) {
    return '';
  }
  const list = subjects.map(subject => {
    const active = subject.id === selectedPaperTrainingSubjectId ? ' selected' : '';
    return `<button type="button" class="paper-training-subject${active}" data-pick-paper-subject="${subject.id}"><span class="paper-training-subject-check">${active ? '✓' : ''}</span><b>${escapeHtml(subject.name)}</b></button>`;
  }).join('');
  return `<div class="paper-training-subject-bar">${list}</div>`;
}

function renderPaperTrainingModePicker() {
  const mode = paperTrainingModeValue();
  const options = [
    ['pensum', 'Pensum', 'Dine noter og materiale'],
    ['extra', 'Ekstra', 'Nye opgaver ud over pensum'],
  ];
  return `<div class="paper-training-mode-inline" aria-label="Vælg træningstype">${options.map(([id, title, text]) => `<button type="button" class="paper-mode-choice${mode === id ? ' selected' : ''}" data-paper-training-mode="${id}" title="${escapeHtml(text)}"><b>${title}</b></button>`).join('')}</div>`;
}

function paperTrainingModeValue() {
  return examData.paperTrainingMode === 'extra' ? 'extra' : 'pensum';
}

function paperTrainingModeLabel(mode = paperTrainingModeValue()) {
  return mode === 'extra' ? 'Ekstra' : 'Pensum';
}

function setPaperTrainingMode(mode) {
  examData.paperTrainingMode = mode === 'extra' ? 'extra' : 'pensum';
  saveExamData();
}

function paperSourceBadge(mode = paperTrainingModeValue()) {
  const safeMode = mode === 'extra' ? 'extra' : 'pensum';
  return `<span class="paper-source-badge ${safeMode}">${paperTrainingModeLabel(safeMode)}</span>`;
}

function tagPaperQuestions(questions, mode = paperTrainingModeValue()) {
  const safeMode = mode === 'extra' ? 'extra' : 'pensum';
  return (questions || []).map(question => ({
    ...question,
    sourceMode: safeMode,
    sourceLabel: paperTrainingModeLabel(safeMode),
  }));
}

function setSelectedPaperTrainingSubject(subjectId) {
  selectedPaperTrainingSubjectId = subjectId || null;
  examData.lastTrainingSubjectId = subjectId || null;
  saveExamData();
}

function renderExamPrepPaperOverview() {
  const host = document.querySelector('#examPrepDialog .exam-prep-overview');
  if (!host) return;
  const subjectBar = renderPaperTrainingSubjectBar();
  const cards = [
    ['quiz','Quiz','Test din viden med spørgsmål','bubble'],
    ['flashcards','Flashcards','Hurtig repetition med kort','cards'],
    ['mixed','Spørgsmål','Træn eksamens-lignende opgaver','clipboard'],
    ['written','Skriv selv','Skriv svar og få feedback','pencil'],
    ['mock','Case','Arbejd med cases / scenarier','folder'],
    ['curriculum','Begrebskort','Organisér emner som mindmap','mindmap'],
    ['weak','Sammenlign','Sammenlign teorier eller begreber','scale'],
    ['repeat','Tidslinje','Husk rækkefølge og udvikling','timeline'],
    ['blackboard','Tom tavle','Forklar alt fra bunden','board'],
    ['oral','Eksamen-prøve','Simuler en fuld eksamen','cap'],
  ].map(([id,title,desc,icon]) => '<button type="button" class="paper-training-card" data-training-preset="' + id + '"><span class="paper-icon ' + icon + '"></span><b>' + title + '</b><small>' + desc + '</small></button>').join('');

  const toolsSection = `<h3 class="paper-section-title">Træn effektivt</h3><div class="paper-training-grid">${cards}</div>`;

  const trainingSets = getPaperTrainingSets();
  const setsSection = trainingSets.length
    ? `<div class="paper-training-row-head"><h3 class="paper-section-title">Mine sæt</h3></div><div class="paper-set-row">${trainingSets.map((set, index) => {
      const count = set.lastItemCount || set.itemCount;
      return '<button type="button" class="paper-folder-set" data-training-preset="flashcards" data-paper-subject-id="' + escapeHtml(set.subjectId) + '"><i></i><b>' + escapeHtml(set.subjectName) + '</b><small>' + count + ' kort</small>' + (index === 0 ? '<span>♡</span>' : '') + '</button>';
    }).join('')}<button type="button" class="paper-folder-new" data-training-preset="flashcards">+<small>Opret<br>nyt sæt</small></button></div>`
    : '';

  const recentEntries = getPaperTrainingRecentActivity(3);
  const recentSection = recentEntries.length
    ? '<section><h3 class="paper-section-title">Seneste aktivitet</h3>' + recentEntries.map(entry => {
      const pct = entry.score != null ? Math.round((entry.score / 10) * 100) : null;
      return '<div class="paper-activity-row"><span>▤</span><div><b>' + escapeHtml(entry.subjectName) + ' · ' + escapeHtml(entry.label) + '</b><small>' + formatDate(entry.date) + '</small></div>' + (pct != null ? '<i><em style="width:' + pct + '%"></em></i><strong>' + pct + '%</strong>' : '<strong>–</strong>') + '</div>';
    }).join('') + '</section>'
    : '';

  const goals = getPaperTrainingTodayGoals();
  const goalNote = goals.hasActivity
    ? '<section class="training-goal-note"><b>I dag:</b><span>' + (goals.quizCount ? '✓ ' + goals.quizCount + ' quiz' + (goals.quizCount > 1 ? 'zer' : '') : '○ Quiz') + '</span><span>' + (goals.flashCount ? '✓ ' + goals.flashCount + ' flashcards' : '○ Flashcards') + '</span><span>' + (goals.mockCount ? '✓ ' + goals.mockCount + ' prøve' + (goals.mockCount > 1 ? 'r' : '') : '○ Prøve') + '</span></section>'
    : '';

  const streak = getPaperTrainingStreak();
  const streakSection = streak > 0
    ? '<section class="paper-streak"><h3 class="paper-section-title">Streak</h3><div>' + ['M','T','O','T','F','L','S'].map((d, i) => '<span class="' + (i < Math.min(streak, 7) ? 'done' : '') + '">' + (i < Math.min(streak, 7) ? '✓' : d) + '</span>').join('') + '</div><b>' + streak + ' dages streak</b></section>'
    : '';

  host.innerHTML = '<div class="paper-training-board"><div class="paper-training-tape"></div>' + goalNote + '<button type="button" class="paper-training-close" data-close="examPrep">×</button><header class="paper-training-title"><h2>Eksamenstræning</h2><i></i><span>✦</span></header><div class="paper-training-divider"><button type="button">hurtig start →</button></div>' + subjectBar + toolsSection + setsSection + '<div class="paper-training-bottom">' + recentSection + '<section class="quick-note">Hurtig start<ul><li>Vælg et fag</li><li>Vælg træningsform</li><li>Kom i gang!</li></ul><span>♡</span></section>' + streakSection + '</div></div>';
}

const paperTrainingLabels = {
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  mixed: 'Spørgsmål',
  written: 'Skriv selv',
  mock: 'Case',
  curriculum: 'Begrebskort',
  weak: 'Sammenlign',
  repeat: 'Tidslinje',
  blackboard: 'Tom tavle',
  oral: 'Eksamen-prøve',
};

function getExamSubjectMaterial(subject) {
  const notePages = data.pages.filter(page => page.subjectId === subject.subjectId);
  const noteText = notePages.map(page => `# ${page.title || 'Note'}\n${plainNoteText(page)}`).filter(Boolean).join('\n\n').slice(0, 12000);
  const litText = (subject.literature || []).map(item => item.text).filter(Boolean).join('\n\n').slice(0, 8000);
  return {
    topics: (subject.topics || []).join(', ') || 'Ingen emner angivet',
    noteText: noteText || '(ingen noter)',
    litText: litText || '(ingen litteratur)',
    savedQuestions: (subject.questions || []).join('\n'),
    noteCount: notePages.length,
  };
}

function parseAIJson(text) {
  const match = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (match ? match[1] : text || '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    const aStart = raw.indexOf('[');
    const aEnd = raw.lastIndexOf(']');
    if (aStart >= 0 && aEnd > aStart) return JSON.parse(raw.slice(aStart, aEnd + 1));
    throw new Error('Kunne ikke læse svar');
  }
}

function parseChoiceQuestionsFromAI(text, subjectName) {
  const blocks = String(text || '').split(/^##\s+/m).filter(block => block.trim().length > 5);
  return blocks.map(block => {
    const lines = block.trim().split('\n').filter(Boolean);
    const prompt = lines[0].trim();
    const options = [];
    let correctLetter = '';
    let explanation = '';
    lines.forEach(line => {
      const optionMatch = line.match(/^([A-D])\)\s*(.+)/);
      if (optionMatch) options.push(optionMatch[2].trim());
      if (/^\*\*Korrekt:\*\*/i.test(line)) correctLetter = line.replace(/^\*\*Korrekt:\*\*\s*/i, '').trim().charAt(0).toUpperCase();
      if (/^\*\*Forklaring:\*\*/i.test(line)) explanation = line.replace(/^\*\*Forklaring:\*\*\s*/i, '').trim();
    });
    const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
    const answer = options[correctIndex >= 0 ? correctIndex : 0] || '';
    return {
      id: uid(),
      type: 'choice',
      subject: subjectName,
      prompt,
      answer,
      options: options.length >= 4 ? options.slice(0, 4) : makeChoiceOptions(answer || prompt, subjectName),
      explanation: explanation || 'Forklar med begreber fra pensum og dine noter.',
    };
  }).filter(question => question.prompt.length > 4);
}

function parseFlashcardsFromAI(text, subjectName) {
  const blocks = String(text || '').split(/^##\s+/m).filter(block => block.trim().length > 3);
  return blocks.map(block => {
    const lines = block.trim().split('\n').filter(Boolean);
    const prompt = lines[0].trim();
    const answerLine = lines.find(line => /^\*\*Svar:\*\*/i.test(line));
    const answer = answerLine ? answerLine.replace(/^\*\*Svar:\*\*\s*/i, '').trim() : lines.slice(1).join(' ').trim();
    return {
      id: uid(),
      type: 'written',
      subject: subjectName,
      prompt,
      answer,
      explanation: answer,
    };
  }).filter(card => card.prompt.length > 2);
}

function parseWrittenQuestionsFromAI(text, subjectName) {
  const blocks = String(text || '').split(/^##\s+/m).filter(block => block.trim().length > 5);
  return blocks.map(block => {
    const lines = block.trim().split('\n').filter(Boolean);
    const prompt = lines[0].trim();
    const hintLine = lines.find(line => /^\*\*Hint:\*\*/i.test(line));
    const hint = hintLine ? hintLine.replace(/^\*\*Hint:\*\*\s*/i, '').trim() : '';
    return {
      id: uid(),
      type: 'written',
      subject: subjectName,
      prompt,
      answer: hint,
      explanation: hint || 'Brug definition, sammenhæng og eksempel fra pensum.',
    };
  }).filter(question => question.prompt.length > 4);
}

function buildPaperTrainingInput(subject, material) {
  return `FAG: ${subject.name}
EKSAMEN: ${subject.date || 'Ikke angivet'}
PENSUMEMNER: ${material.topics}
NOTER (${material.noteCount} stk.):
${material.noteText}
LITTERATUR:
${material.litText}
GEMTE EKSAMENSSPØRGSMÅL:
${material.savedQuestions || '(ingen)'}`;
}

async function requestPaperTrainingAI(preset, subject, material, mode = paperTrainingModeValue()) {
  const input = buildPaperTrainingInput(subject, material);
  const prompts = {
    quiz: 'Lav 8 multiple-choice spørgsmål på dansk ud fra materialet. Variér mellem definition, anvendelse og sammenligning. Format for hvert spørgsmål:\n## [spørgsmål]\nA) ...\nB) ...\nC) ...\nD) ...\n**Korrekt:** A|B|C|D\n**Forklaring:** [kort faglig forklaring]',
    flashcards: 'Lav 10 flashcards på dansk ud fra materialet. Format:\n## [spørgsmål/front]\n**Svar:** [kort præcist svar]',
    mixed: 'Lav 8 eksamenslignende opgaver på dansk: 4 multiple-choice og 4 skriftlige forklaringsspørgsmål. MC-format:\n## [spørgsmål]\nA) ...\nB) ...\nC) ...\nD) ...\n**Korrekt:** A|B|C|D\n**Forklaring:** ...\nSkriftligt format:\n## [spørgsmål]\n**Hint:** [hvad et godt svar bør indeholde]',
    written: 'Lav 6 skriftlige eksamensspørgsmål på dansk ud fra materialet. Format:\n## [spørgsmål]\n**Hint:** [hvad et godt svar bør indeholde]',
    curriculum: 'Lav et begrebskort/mindmap som JSON: {"center":"hovedbegreb","nodes":["begreb1","begreb2","begreb3","begreb4"]}. Brug centrale begreber fra pensum.',
    weak: 'Sammenlign to centrale begreber/teorier fra faget som JSON: {"a":{"title":"...","text":"..."},"b":{"title":"...","text":"..."}}',
    repeat: 'Lav en faglig tidslinje/rækkefølge som JSON: {"steps":[{"title":"...","detail":"..."}]} med 4-6 trin fra pensum.',
    mock: 'Lav en case/scenarie-opgave som JSON: {"title":"...","scenario":"...","tasks":["...","..."]}',
    blackboard: 'Giv en opgave til at forklare pensum fra bunden som JSON: {"topic":"...","prompt":"...","keyPoints":["...","...","..."]}',
    oral: 'Simuler en fuld eksamen som JSON: {"title":"...","duration":"...","intro":"...","parts":[{"title":"...","detail":"..."}],"questions":["...","...","..."]}',
  };
  const sourceInstruction = mode === 'extra'
    ? `Du skal lave EKSTRA træning. Brug materialet til at forstå fagets niveau, begreber og retning, men lav nye relevante spørgsmål og opgaver, der går ud over det konkrete materiale. Skriv ikke som om de står i noterne. Alle opgaver skal stadig passe naturligt til faget "${subject.name}".`
    : `Du skal lave PENSUM-træning. Brug kun noter, litteratur og tilføjet materiale til faglige påstande. Hvis noget ikke fremgår af materialet, så lav ikke et facit om det.`;
  const instructions = `Du er en ekstremt dygtig dansk eksamenstræner og faglig tutor. Du laver klare, varierede og eksamensnære opgaver til netop dette fag. ${sourceInstruction} ${prompts[preset] || prompts.mixed} Skriv på dansk. Hold spørgsmål præcise, feedback brugbar og sværhedsgraden passende.`;
  return requestOpenAI({ instructions, input });
}

function questionsFromFallback(subject, preset) {
  const modeMap = { quiz: 'mixed', flashcards: 'flashcards', mixed: 'mixed', written: 'written', weak: 'weak', mock: 'mixed', oral: 'mixed' };
  const mode = modeMap[preset] || 'mixed';
  let questions = buildExamQuestions([subject], mode);
  if (preset === 'quiz') questions = questions.filter(question => question.type === 'choice');
  if (preset === 'written') questions = questions.filter(question => question.type === 'written');
  if (preset === 'flashcards') {
    questions = questions.map(question => ({ ...question, prompt: question.prompt.replace(/^Forklar /, '') }));
  }
  return questions.slice(0, preset === 'flashcards' ? 12 : 8);
}

async function buildPaperTrainingState(preset, subject, mode = paperTrainingModeValue()) {
  const material = getExamSubjectMaterial(subject);
  let payload = null;
  let quiz = null;
  try {
    const aiText = await requestPaperTrainingAI(preset, subject, material, mode);
    if (['quiz', 'mixed'].includes(preset)) {
      const choiceQuestions = parseChoiceQuestionsFromAI(aiText, subject.name);
      if (preset === 'mixed') {
        const writtenQuestions = parseWrittenQuestionsFromAI(aiText, subject.name);
        quiz = { questions: [...choiceQuestions, ...writtenQuestions].slice(0, 10), mode: 'mixed' };
      } else {
        quiz = { questions: choiceQuestions.slice(0, 10), mode: 'mixed' };
      }
    } else if (preset === 'flashcards') {
      quiz = { questions: parseFlashcardsFromAI(aiText, subject.name).slice(0, 12), mode: 'flashcards' };
    } else if (['written', 'mock', 'oral'].includes(preset)) {
      const writtenQuestions = parseWrittenQuestionsFromAI(aiText, subject.name);
      if (writtenQuestions.length) {
        quiz = { questions: writtenQuestions.slice(0, preset === 'written' ? 6 : 8), mode: 'written' };
      } else {
        payload = parseAIJson(aiText);
        if (payload?.questions?.length) {
          quiz = {
            questions: payload.questions.map(item => ({
              id: uid(),
              type: 'written',
              subject: subject.name,
              prompt: typeof item === 'string' ? item : item.prompt || item.title,
              answer: typeof item === 'string' ? '' : (item.hint || item.answer || ''),
              explanation: typeof item === 'string' ? '' : (item.hint || item.answer || ''),
            })),
            mode: 'written',
          };
        }
      }
    } else {
      payload = parseAIJson(aiText);
    }
  } catch {
    payload = null;
  }
  if (['quiz', 'flashcards', 'mixed', 'written', 'mock', 'oral'].includes(preset) && (!quiz?.questions?.length)) {
    const fallbackQuestions = questionsFromFallback(subject, preset);
    if (fallbackQuestions.length) {
      quiz = {
        questions: fallbackQuestions,
        mode: preset === 'flashcards' ? 'flashcards' : preset === 'quiz' ? 'mixed' : (preset === 'written' ? 'written' : 'mixed'),
      };
    }
  }
  if (['curriculum', 'weak', 'repeat', 'blackboard'].includes(preset) && !payload) {
    throw new Error('Kunne ikke lave træningen. Prøv igen.');
  }
  if (['mock', 'oral'].includes(preset) && !payload && !quiz?.questions?.length) {
    throw new Error('Kunne ikke lave træningen. Prøv igen.');
  }
  if (quiz?.questions?.length) {
    quiz.questions = tagPaperQuestions(quiz.questions, mode);
  }
  return { preset, subject, subjectId: subject.id, data: payload, quiz, sourceMode: mode, sourceLabel: paperTrainingModeLabel(mode) };
}

function renderPaperTrainingSubjectPicker(preset) {
  const title = paperTrainingLabels[preset] || 'Træning';
  const modePicker = renderPaperTrainingModePicker();
  if (!examData.subjects?.length) {
    return `<section class="paper-tool-page paper-pick-subject"><header><button type="button" data-exam-activity-back>‹ Tilbage</button><h2>${escapeHtml(title)}</h2></header><main>${modePicker}<div class="exam-plan-required"><span>▦</span><div><b>Tilføj fag i eksamensplanen</b><p>Træningen bygger på fag, pensum og noter fra din eksamensplan.</p></div><button type="button" class="btn-primary" data-go-exam-plan>Åbn eksamensplan</button></div></main></section>`;
  }
  const subjects = examData.subjects.map((subject, index) => {
    const noteCount = data.pages.filter(page => page.subjectId === subject.subjectId).length;
    return `<label class="paper-subject-pick${index === 0 && !selectedPaperTrainingSubjectId ? ' selected' : ''}${subject.id === selectedPaperTrainingSubjectId ? ' selected' : ''}"><input type="radio" name="paperTrainingSubject" value="${subject.id}" ${subject.id === selectedPaperTrainingSubjectId || (index === 0 && !selectedPaperTrainingSubjectId) ? 'checked' : ''}><span><b>${escapeHtml(subject.name)}</b><small>${(subject.topics || []).length} pensumemner · ${noteCount} noter</small></span></label>`;
  }).join('');
  const modeText = paperTrainingModeValue() === 'extra'
    ? 'Ekstra giver nye opgaver, der passer til faget, men ligger uden for dine konkrete noter.'
    : 'Pensum bruger dine noter, emner og tilføjet materiale for det valgte fag.';
  return `<section class="paper-tool-page paper-pick-subject"><header><button type="button" data-exam-activity-back>‹ Tilbage</button><h2>${escapeHtml(title)}</h2></header><main><h3>Vælg fag</h3><p class="hint">${escapeHtml(modeText)}</p>${modePicker}<div class="paper-subject-pick-list">${subjects}</div><button type="button" class="btn-primary" data-generate-paper-training="${preset}">Start ${escapeHtml(title.toLowerCase())}</button></main></section>`;
}

function renderPaperTrainingSession(state) {
  const { preset, subject, data: payload } = state;
  const title = paperTrainingLabels[preset] || preset;
  const header = `<header><button type="button" data-exam-activity-back>‹ Tilbage</button><h2>${escapeHtml(subject.name)} · ${escapeHtml(title)}</h2><div class="paper-tool-head-actions">${paperSourceBadge(state.sourceMode)}</div></header>`;

  if (['quiz', 'flashcards', 'mixed', 'written'].includes(preset)) {
    return `<section class="paper-tool-page quiz-session-page">${header}<div id="paperTrainingQuiz" class="exam-activity-quiz"></div></section>`;
  }
  if (preset === 'curriculum' && payload) {
    const nodes = (payload.nodes || []).slice(0, 6);
    const positions = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
    const lines = ['l1', 'l2', 'l3', 'l4', 'l5'];
    return `<section class="paper-tool-page concept-page">${header}<main class="concept-card-large"><h3>Begrebskort</h3><div class="concept-map"><b>${escapeHtml(payload.center || subject.name)}</b>${nodes.map((node, index) => `<span class="${positions[index]}">${escapeHtml(node)}</span>`).join('')}${lines.slice(0, Math.max(0, nodes.length - 1)).map(line => `<i class="${line}"></i>`).join('')}</div><strong>${nodes.length} begreber</strong></main></section>`;
  }
  if (preset === 'weak' && payload?.a && payload?.b) {
    return `<section class="paper-tool-page compare-page">${header}<main><article><b>${escapeHtml(payload.a.title)}</b><p>${escapeHtml(payload.a.text)}</p></article><article><b>${escapeHtml(payload.b.title)}</b><p>${escapeHtml(payload.b.text)}</p></article></main></section>`;
  }
  if (preset === 'repeat' && payload?.steps?.length) {
    return `<section class="paper-tool-page timeline-page">${header}<main>${payload.steps.map((step, index) => `<div><span>${index + 1}</span><b>${escapeHtml(step.title)}</b><small>${escapeHtml(step.detail || '')}</small></div>`).join('')}</main></section>`;
  }
  if (preset === 'blackboard' && payload) {
    return `<section class="paper-tool-page blackboard-page">${header}<main><canvas id="paperBlackboardCanvas" width="1100" height="520"></canvas><aside><b>${escapeHtml(payload.topic || 'Opgave')}</b><p id="cleanBoardText">${escapeHtml(payload.prompt || '')}</p><ul class="paper-key-points">${(payload.keyPoints || []).map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul><button type="button" data-board-clean>Vis struktur</button></aside></main></section>`;
  }
  if ((preset === 'mock' || preset === 'oral') && payload) {
    const tasks = payload.tasks || payload.questions || [];
    const parts = payload.parts || [];
    const partsHtml = parts.length ? `<div class="mock-exam-parts">${parts.map(part => `<article><b>${escapeHtml(part.title || '')}</b><p>${escapeHtml(part.detail || '')}</p></article>`).join('')}</div>` : '';
    const durationHtml = payload.duration ? `<span class="mock-duration">${escapeHtml(payload.duration)}</span>` : '';
    return `<section class="paper-tool-page mock-page">${header}<main><div class="mock-ticket"><b>${escapeHtml(payload.title || title)}</b>${durationHtml}<p>${escapeHtml(payload.scenario || payload.intro || subject.name)}</p>${partsHtml}${tasks.length ? `<ul>${tasks.map(task => `<li>${escapeHtml(typeof task === 'string' ? task : task.prompt || task.title || '')}</li>`).join('')}</ul>` : ''}${state.quiz?.questions?.length ? `<button type="button" class="btn-primary" data-start-paper-quiz>Start skriftlig del</button>` : ''}</div></main></section>`;
  }
  return `<section class="paper-tool-page">${header}<main class="exam-activity-panel"><p class="hint">Træningen kunne ikke vises. Prøv igen.</p></main></section>`;
}

async function generatePaperTraining(preset, subjectId, mode = paperTrainingModeValue()) {
  if (!requireExamTrainingPremium()) return;
  selectedExamActivity = preset;
  setExamPrepDialogMode(true);
  const host = $('#examPrepWorkspace');
  const subject = (examData.subjects || []).find(item => item.id === subjectId);
  if (!subject) return alert('Faget blev ikke fundet.');
  const label = (paperTrainingLabels[preset] || 'træning').toLowerCase();
  if (host) showAiLoading(host, `Laver ${label} til ${subject.name}…`);
  try {
    paperTrainingState = await buildPaperTrainingState(preset, subject, mode);
    selectedExamActivityTab = 'page';
    const itemCount = paperTrainingState.quiz?.questions?.length
      || paperTrainingState.data?.nodes?.length
      || paperTrainingState.data?.steps?.length
      || paperTrainingState.data?.tasks?.length
      || paperTrainingState.data?.questions?.length
      || paperTrainingState.data?.parts?.length
      || 1;
    if (!['quiz', 'flashcards', 'mixed', 'written'].includes(preset)) {
      recordPaperTrainingSession(preset, subject, itemCount);
    }
    if (paperTrainingState.quiz?.questions?.length) {
      activeExamQuiz = {
        questions: paperTrainingState.quiz.questions,
        index: 0,
        correct: 0,
        scores: [],
        answered: new Set(),
        subjectIds: [subject.id],
        mode: paperTrainingState.quiz.mode,
        flipped: false,
        setName: `${subject.name} · ${paperTrainingLabels[preset]}`,
        sourceMode: paperTrainingState.sourceMode,
        sourceLabel: paperTrainingState.sourceLabel,
        selectedAnswer: '',
      };
    } else {
      activeExamQuiz = null;
    }
    renderExamActivityWorkspace();
  } catch (err) {
    if (host) {
      host.innerHTML = `<div class="exam-activity-panel"><h4>Kunne ikke starte træning</h4><p class="hint">${escapeHtml(err.message || 'Prøv igen om lidt.')}</p><button type="button" class="btn-primary" data-exam-activity-back>Tilbage</button></div>`;
    }
  }
}

function setupPaperBlackboard() {
  const canvas = document.getElementById('paperBlackboardCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,245,.86)';
  let last = null;
  canvas.onpointermove = event => {
    const rect = canvas.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 90) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.quadraticCurveTo((last.x + point.x) / 2, (last.y + point.y) / 2, point.x, point.y);
      ctx.stroke();
    }
    last = point;
  };
  canvas.onpointerleave = () => { last = null; };
}

function renderExamPrepFolders() {
  const host = $('#examPrepFolders');
  if (!host) return;
  host.innerHTML = examData.folders.length
    ? examData.folders.map(folder => `<button type="button" class="prep-folder" data-exam-folder="${folder.id}"><span>▰</span>${escapeHtml(folder.name)}<small>${folder.subjectIds.length} fag</small></button>`).join('')
    : '<span class="hint">Ingen gemte mapper endnu.</span>';
}

function ensureExamSelfNotes() {
  const dialog = $('#examPrepDialog .modal');
  if (!dialog || $('#examSelfNotes')) return;
  const section = document.createElement('section');
  section.id = 'examSelfNotes';
  section.className = 'exam-self-notes collapsed';
  section.innerHTML = `<button type="button" class="exam-self-notes-stack" data-toggle-exam-notes>
      <i></i><i></i><i></i><span>Noter til mig selv</span>
    </button>
    <div class="exam-self-notes-board">
      <header><div><span class="engineering-tag">MINE HUSKESEDLER</span><h3>Noter til mig selv</h3></div><button type="button" class="btn-outline" data-toggle-exam-notes>Gem sedlerne</button></header>
      <div class="exam-self-note-grid"></div>
      <button type="button" class="btn-outline" data-add-exam-note>+ Ny post it</button>
    </div>`;
  const result = $('#examPrepResult');
  result?.before(section);
  renderExamSelfNotes();
}

function renderExamSelfNotes() {
  const grid = $('#examSelfNotes .exam-self-note-grid');
  if (!grid) return;
  examData.selfNotes ||= [];
  grid.innerHTML = examData.selfNotes.map((note, index) => `<article class="exam-self-note color-${index % 5}">
    <button type="button" data-delete-exam-note="${note.id}" aria-label="Slet huskeseddel">×</button>
    <textarea data-exam-note="${note.id}" placeholder="Skriv noget, du skal huske...">${escapeHtml(note.text || '')}</textarea>
  </article>`).join('');
}

const examActivityMeta = {
  mixed: { icon: '✦', title: 'Blandet eksamen', subtitle: 'Valg, flashcards og forklaringer', tip: 'Bland forskellige spørgsmålstyper for at træne bredt.' },
  flashcards: { icon: '▢', title: 'Lav flashcards', subtitle: 'Vend kort lavet fra dine noter og dit pensum', tip: 'Gentag tit = husk det bedre! Brug aktiv gentagelse.' },
  quiz: { icon: 'ABC', title: 'Lav quiz', subtitle: 'Svar A, B eller C og få forklaring med det samme', tip: 'Læs alle svarmuligheder før du vælger.' },
  oral: { icon: '◉', title: 'Mundtlig simulator', subtitle: 'Træk et emne og forklar højt', tip: 'Øv oplæg, disposition og uddybende spørgsmål højt.' },
  weak: { icon: '↗', title: 'Svage emner', subtitle: 'Prioritér det, du mangler at forstå', tip: 'Fokusér på emner med korte eller manglende noter.' },
  speed: { icon: '◷', title: '10-minutters test', subtitle: 'Hurtig træning med tidspres', tip: 'Hold tempoet oppe – korte svar tæller også.' },
  curriculum: { icon: '▦', title: 'Pensumkort', subtitle: 'Se hele pensum som et visuelt kort', tip: 'Brug kortene til at finde huller i dit overblik.' },
  mock: { icon: '◇', title: 'Prøveeksamen', subtitle: 'Simulér en rigtig eksamen', tip: 'Sæt en timer og gennemfør hele testen uden pause.' },
  repeat: { icon: '↻', title: 'Repetitionshjul', subtitle: 'Gentag på de rigtige tidspunkter', tip: 'Kort du glemmer kommer tilbage oftere.' },
  progress: { icon: '▥', title: 'Resultater', subtitle: 'Point, fejltyper og udvikling', tip: 'Sammenlign resultater over tid – ikke kun én test.' },
  synopsis: { icon: '¶', title: 'Synopsis hjælp', subtitle: 'Problemformulering, struktur, metode og kilder', tip: 'Start med problemstillingen – resten følger naturligt.' },
  'oral-guide': { icon: '◯', title: 'Mundtlig eksamen', subtitle: 'Disposition, hjælpemidler og oplæg', tip: 'Kontrollér altid universitetets officielle eksamensregler.' },
  written: { icon: 'Aa', title: 'Skriftlig eksamen', subtitle: 'Tidsplan, opgavetyper og kvalitetstjek', tip: 'Fordel tiden: læs, dispositionsfase, skriv, korrektur.' },
};

function setExamPrepDialogMode(active) {
  const dialog = $('#examPrepDialog');
  dialog?.classList.toggle('tool-active', active);
  const workspace = $('#examPrepWorkspace');
  if (workspace) workspace.hidden = !active;
}

function setExamDialogMode(active) {
  const dialog = $('#examDialog');
  dialog?.classList.toggle('tool-active', active);
  const workspace = $('#examPlanWorkspace');
  if (workspace) workspace.hidden = !active;
}

function getExamQuizHost() {
  return $('#examActivityQuiz') || $('#paperTrainingQuiz') || $('#examPrepResult');
}

const examActivityThemes = {
  flashcards: 'warm', synopsis: 'warm', curriculum: 'warm', repeat: 'warm',
  mixed: 'warm', quiz: 'warm', oral: 'warm', weak: 'warm', speed: 'warm',
  mock: 'warm', progress: 'warm', 'oral-guide': 'warm', written: 'warm',
};

function examActivityShell(activityId, tab, sidebarNav, mainHtml, options = {}) {
  const meta = examActivityMeta[activityId] || { icon: '•', title: activityId, subtitle: '', tip: '' };
  const theme = options.theme || examActivityThemes[activityId] || 'warm';
  const sidebarInfo = options.sidebarInfo || '';
  const setCard = options.setCard || '';
  const closeTarget = options.closeTarget || 'examPrep';
  return `<div class="exam-activity-shell" data-exam-activity="${activityId}" data-theme="${theme}">
    <aside class="exam-activity-sidebar">
      <div class="exam-activity-sidebar-top">
        <button type="button" class="exam-activity-back" data-exam-activity-back>← Tilbage til oversigt</button>
        <button type="button" class="exam-activity-close" data-close="${closeTarget}" title="Luk">×</button>
      </div>
      <div class="exam-activity-brand"><span>${meta.icon}</span><h3>${escapeHtml(meta.title)}</h3><p>${escapeHtml(meta.subtitle)}</p></div>
      ${setCard}
      ${sidebarInfo}
      <nav class="exam-activity-nav">${sidebarNav}</nav>
      <div class="exam-activity-tip"><strong>Tip</strong>${escapeHtml(options.tip || meta.tip)}</div>
    </aside>
    <main class="exam-activity-main" data-exam-activity-tab="${tab}">${mainHtml}</main>
  </div>`;
}

function examActivityNavItem(id, icon, title, desc, active) {
  return `<button type="button" class="${active ? 'active' : ''}" data-exam-activity-tab="${id}"><span>${icon}</span><div><b>${escapeHtml(title)}</b><small>${escapeHtml(desc)}</small></div></button>`;
}

function renderExamPrepSubjectsInline(hostId = 'examActivitySubjects') {
  if (!examData.plan?.length) {
    return `<div class="exam-plan-required"><span>▦</span><div><b>Lav eksamensplanen først</b><p>Træningen bruger fag, pensum, noter og spørgsmål fra din plan.</p></div><button type="button" class="btn-primary" data-go-exam-plan>Åbn eksamensplan</button></div>`;
  }
  return `<div id="${hostId}" class="prep-subjects">${examData.subjects.map(subject => {
    const noteSubject = data.subjects.find(item => item.id === subject.subjectId);
    const noteCount = noteSubject ? data.pages.filter(page => page.subjectId === noteSubject.id).length : 0;
    return `<label><input type="checkbox" value="${subject.id}" checked><span><b>${escapeHtml(subject.name)}</b><small>${subject.topics.length} pensumemner · ${noteCount} noter</small></span></label>`;
  }).join('')}</div>`;
}

function getFlashcardSets() {
  const derived = (examData.subjects || []).map(subject => {
    const noteSubject = data.subjects.find(item => item.id === subject.subjectId);
    const pages = noteSubject ? data.pages.filter(page => page.subjectId === noteSubject.id) : [];
    const cards = pages.flatMap(page => extractNoteSections(page).map(section => ({
      front: section.title,
      back: section.text.slice(0, 280),
      sourcePage: page.title || 'Uden titel',
      sourcePageId: page.id,
    }))).filter(card => card.front);
    const saved = (examData.flashcardSets || []).find(set => set.subjectId === subject.id);
    if (saved) return saved;
    if (!cards.length) return null;
    return {
      id: `derived-${subject.id}`,
      name: subject.name,
      subjectId: subject.id,
      cards,
      derived: true,
      lastStudied: null,
      progress: 0,
    };
  }).filter(Boolean);
  const custom = (examData.flashcardSets || []).filter(set => !derived.some(item => item.id === set.id));
  return [...custom, ...derived];
}

function openExamActivity(activityId, tab = 'overview') {
  selectedExamActivity = activityId;
  selectedExamActivityTab = tab;
  activeExamQuiz = null;
  ensureExamDataShape();
  setExamPrepDialogMode(true);
  renderExamActivityWorkspace();
  $('#examPrepDialog')?.showModal();
}

function closeExamActivity() {
  selectedExamActivity = null;
  selectedExamActivityTab = 'overview';
  activeExamQuiz = null;
  paperTrainingState = null;
  setExamPrepDialogMode(false);
  const workspace = $('#examPrepWorkspace');
  if (workspace) workspace.innerHTML = '';
  if ($('#examPrepDialog')?.open) renderExamPrepPaperOverview();
}

function renderExamActivityWorkspace() {
  const host = $('#examPrepWorkspace');
  if (!host || !selectedExamActivity) return;
  try {
    const id = selectedExamActivity;
    if (selectedExamActivityTab === 'pick-subject') {
      host.innerHTML = renderPaperTrainingSubjectPicker(id);
      return;
    }
    if (selectedExamActivityTab === 'page' && paperTrainingState?.preset === id) {
      host.innerHTML = renderPaperTrainingSession(paperTrainingState);
      if (activeExamQuiz) renderExamQuiz();
      if (id === 'blackboard') setupPaperBlackboard();
      return;
    }
    if (id === 'flashcards') host.innerHTML = renderFlashcardsActivity(selectedExamActivityTab);
    else if (id === 'synopsis') host.innerHTML = renderSynopsisActivity(selectedExamActivityTab);
    else if (id === 'curriculum') host.innerHTML = renderPensumkortActivity(selectedExamActivityTab);
    else if (id === 'repeat') host.innerHTML = renderRepeatActivity(selectedExamActivityTab);
    else if (id === 'progress') host.innerHTML = renderProgressActivity(selectedExamActivityTab);
    else if (id === 'written' && selectedExamActivityTab === 'guide') host.innerHTML = renderExamGuideActivity('written');
    else if (id === 'oral' && selectedExamActivityTab === 'guide') host.innerHTML = renderExamGuideActivity('oral');
    else host.innerHTML = renderTrainingActivity(id, selectedExamActivityTab);
  } catch (err) {
    console.error('Exam activity render failed', err);
    host.innerHTML = `<div class="exam-activity-panel"><h4>Kunne ikke åbne aktiviteten</h4><p class="hint">${escapeHtml(err.message || 'Ukendt fejl')}</p><button type="button" class="btn-primary" data-exam-activity-back>Tilbage</button></div>`;
  }
}

function renderFlashcardsActivity(tab) {
  const sets = getFlashcardSets();
  const nav = [
    examActivityNavItem('overview', '▢', 'Opret nyt sæt', 'Upload eller vælg noter', tab === 'overview'),
    examActivityNavItem('sets', '▤', 'Mine sæt', `${sets.length} sæt`, tab === 'sets'),
    examActivityNavItem('train', '▶', 'Træning', 'Test dig selv', tab === 'train'),
    examActivityNavItem('stats', '▥', 'Statistik', 'Fremgang', tab === 'stats'),
  ].join('');
  const setIcons = ['green', 'pink', 'blue'];
  const setEmojis = ['📗', '🧠', '🌍'];
  let main = '';
  if (tab === 'sets') {
    main = `<div class="exam-activity-head"><div><h2>Dine flashcard-sæt</h2><p>Vælg et sæt og start træning.</p></div><button type="button" class="exam-head-menu" aria-label="Menu">⋯</button></div>
      <div class="fc-sets-header"><h4>Dine flashcard-sæt</h4><span class="fc-sets-badge">${sets.length} sæt</span></div>
      ${sets.length ? sets.map((set, i) => {
        const pct = set.progress || 0;
        const studied = set.lastStudied ? `Studeret ${formatDate(set.lastStudied)}` : 'Ikke studeret endnu';
        return `<article class="fc-set-row"><span class="set-icon ${setIcons[i % 3]}">${setEmojis[i % 3]}</span><div><b>${escapeHtml(set.name)}</b><small>${set.cards.length} kort${set.cards[0]?.sourcePage ? ` · fra «${escapeHtml(set.cards[0].sourcePage)}»` : ''}</small></div><span class="set-status">${studied}</span><div class="fc-set-progress-wrap"><div class="exam-set-progress"><i style="width:${pct}%"></i></div><div class="pct">${pct}%</div></div><button type="button" class="btn-outline" data-edit-flashcard-set="${set.id}" ${set.derived ? 'disabled title="Generér og gem sættet først"' : ''}>Rediger</button><button type="button" class="btn-primary" data-start-flashcard-set="${set.id}">Start træning</button></article>`;
      }).join('') : '<div class="empty-list">Upload en PDF eller vælg noter for at lave dit første sæt.</div>'}`;
  } else if (tab === 'train') {
    const activeSet = sets[0];
    main = `<div class="exam-activity-head"><div><h2>Træning</h2><p>Test dig selv og bliv bedre for hver gang!</p></div><button type="button" class="btn-outline" data-start-flashcard-training>Afbryd test</button></div>
      ${renderExamPrepSubjectsInline()}
      <div id="examActivityQuiz" class="exam-activity-quiz"></div>`;
  } else if (tab === 'stats') {
    const results = (examData.trainingResults || []).slice(-8).reverse();
    main = `<div class="exam-activity-head"><div><h2>Statistik</h2><p>Din udvikling over tid.</p></div></div>
      <div class="exam-stats-row"><article class="exam-stat-card pink"><span class="stat-icon">⭐</span><strong>${rewardData.points}</strong><span>Point</span></article><article class="exam-stat-card yellow"><span class="stat-icon">📊</span><strong>${results.length}</strong><span>Træninger</span></article><article class="exam-stat-card green"><span class="stat-icon">▢</span><strong>${sets.reduce((sum, set) => sum + set.cards.length, 0)}</strong><span>Kort i alt</span></article><article class="exam-stat-card blue"><span class="stat-icon">🏆</span><strong>${results[0]?.score ?? '–'}</strong><span>Seneste score</span></article></div>
      <div class="exam-activity-panel"><h4>Seneste resultater</h4>${results.length ? results.map(item => `<p><b>${formatDate(item.date)}</b> · ${item.score}/10 · ${escapeHtml(item.readiness || '')}</p>`).join('') : '<p class="hint">Ingen resultater endnu. Start din første træning.</p>'}</div>`;
  } else {
    const noteOptions = examData.subjects?.length
      ? examData.subjects.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')
      : '<option value="">Ingen fag endnu</option>';
    main = `<div class="exam-activity-head"><div><h2>Lav flashcards</h2><p>Vælg dit materiale, og vi hjælper dig med at lave flashcards.</p></div><button type="button" class="exam-head-menu" aria-label="Menu">⋯</button></div>
      <div class="fc-upload-grid">
        <div class="fc-upload-card dashed"><div class="upload-icon">📄</div><p>Upload en PDF, så laver vi flashcards til dig</p><label class="exam-material-drop" style="min-height:0;padding:0;border:0;background:transparent"><input type="file" data-exam-flashcard-pdf accept=".pdf,application/pdf"></label><button type="button" class="btn-primary" data-trigger-flashcard-pdf>Upload PDF</button></div>
        <div class="fc-upload-or">eller</div>
        <div class="fc-upload-card"><div class="upload-icon">📓</div><p>Vælg en af dine noter, og få flashcards baseret på indholdet</p><select class="field" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ece8f4;margin-bottom:12px" id="fcNotePicker">${noteOptions}</select><button type="button" class="btn-primary" data-create-flashcards-from-notes>Vælg noter</button></div>
      </div>
      <div class="exam-activity-panel"><h4>Sådan virker det</h4><div class="fc-how-steps">
        <article class="fc-how-step"><em>1</em><b>Vi laver flashcards</b><small>De vigtigste spørgsmål fra dit materiale</small></article>
        <article class="fc-how-step"><em>2</em><b>Gennemgå og rediger</b><small>Tilpas kortene efter behov</small></article>
        <article class="fc-how-step"><em>3</em><b>Træn og lær</b><small>Start træningen med det samme</small></article>
        <article class="fc-how-step"><em>4</em><b>Følg din fremgang</b><small>Se resultater over tid</small></article>
      </div></div>
      ${sets.length ? `<div class="fc-sets-header"><h4>Dine flashcard-sæt</h4><span class="fc-sets-badge">${sets.length} sæt</span></div>${sets.slice(0, 3).map((set, i) => `<article class="fc-set-row"><span class="set-icon ${setIcons[i % 3]}">${setEmojis[i % 3]}</span><div><b>${escapeHtml(set.name)}</b><small>${set.cards.length} kort</small></div><span class="set-status">${set.lastStudied ? `Studeret ${formatDate(set.lastStudied)}` : 'Ikke studeret'}</span><div class="fc-set-progress-wrap"><div class="exam-set-progress"><i style="width:${set.progress || 0}%"></i></div><div class="pct">${set.progress || 0}%</div></div><button type="button" class="btn-primary" data-start-flashcard-set="${set.id}">Start træning</button></article>`).join('')}` : ''}`;
  }
  return examActivityShell('flashcards', tab, nav, main);
}

function synopsisSidebarInfo() {
  return `<div class="exam-sidebar-info">
    <div><span>◎</span><div><b>Mål</b><p>Strukturér din synopsis med problemstilling, metode og konklusion.</p></div></div>
    <div><span>▤</span><div><b>Hvornår?</b><p>Inden du skriver opgaven eller forbereder mundtlig eksamen.</p></div></div>
    <div><span>✦</span><div><b>Hvorfor?</b><p>En god synopsis gør det nemmere at skrive og huske hovedpointer.</p></div></div>
  </div>`;
}

const synopsisFieldPlaceholders = {
  title: 'Fx Hjemmearbejde og motivation',
  purpose: 'Fx Undersøge sammenhæng mellem X og Y',
  problem: 'Fx Hvordan påvirker X gymnasieelevers Y?',
  method: 'Fx Kvalitativ interviewundersøgelse med 8 deltagere',
  points: 'Fx • Teori om motivation\n• Empiriske fund\n• Diskussion',
  conclusion: 'Fx X kan både øge og mindske Y afhængigt af kontekst',
};

function synopsisDraftFieldsHtml(draft = {}) {
  return ['title', 'purpose', 'problem', 'method', 'points', 'conclusion'].map(field => {
    const labels = { title: 'Titel / Emne', purpose: 'Formål', problem: 'Problemstilling', method: 'Metode', points: 'Hovedpointer', conclusion: 'Konklusion' };
    const isArea = field === 'points' || field === 'method';
    const placeholder = synopsisFieldPlaceholders[field];
    return `<div class="exam-template-field"><label>${labels[field]}</label>${isArea ? `<textarea name="${field}" rows="2" placeholder="${escapeHtml(placeholder)}">${escapeHtml(draft[field] || '')}</textarea>` : `<input name="${field}" value="${escapeHtml(draft[field] || '')}" placeholder="${escapeHtml(placeholder)}">`}</div>`;
  }).join('');
}
function synopsisExampleHtml() {
  return `<aside class="exam-template-example"><h5>📌 Eksempel</h5>
    <div class="example-row"><label>Titel / Emne</label><span>Hjemmearbejde og motivation</span></div>
    <div class="example-row"><label>Formål</label><span>Undersøge sammenhængen mellem hjemmearbejde og studiemotivation</span></div>
    <div class="example-row"><label>Problemstilling</label><span>Hvordan påvirker hjemmearbejde gymnasieelevers motivation?</span></div>
    <div class="example-row"><label>Metode</label><span>Kvalitativ interviewundersøgelse med 8 elever</span></div>
    <div class="example-row"><label>Hovedpointer</label><span>• Teori om motivation<br>• Empiriske fund<br>• Diskussion af resultater</span></div>
    <div class="example-row"><label>Konklusion</label><span>Hjemmearbejde kan både øge og mindske motivation afhængigt af opgavetype</span></div>
  </aside>`;
}

function renderSynopsisActivity(tab) {
  ensureExamDataShape();
  const draft = examData.synopsisDrafts?.default || {};
  const nav = [
    examActivityNavItem('overview', '¶', 'Kom i gang', 'Materiale og skabelon', tab === 'overview'),
    examActivityNavItem('template', '▤', 'Skabelon', 'Udfyld din synopsis', tab === 'template'),
    examActivityNavItem('guide', '✦', 'AI-vejledning', 'Få hjælp ud fra din plan', tab === 'guide'),
  ].join('');
  let main = '';
  if (tab === 'template') {
    main = `<div class="exam-activity-head"><div><h2>Skabelon</h2><p>Udfyld felterne – data gemmes automatisk.</p></div><button type="button" class="btn-primary" data-generate-synopsis-guide>Generér vejledning</button></div>
      <div class="exam-template-grid exam-template-compact"><form class="exam-template-form" data-synopsis-draft>
        <h5 style="margin:0 0 12px;font-size:13px">Skabelon</h5>
        ${synopsisDraftFieldsHtml(draft)}
      </form>${synopsisExampleHtml()}</div><div id="examActivityQuiz" class="exam-activity-quiz"></div>`;
  } else if (tab === 'guide') {
    main = `<div class="exam-activity-head"><div><h2>AI-vejledning</h2><p>Bygget på din eksamensplan, noter og litteratur.</p></div><button type="button" class="btn-primary" data-generate-synopsis-guide>Generér vejledning</button></div>
      ${renderExamPrepSubjectsInline()}<div id="examActivityQuiz" class="exam-activity-quiz"></div>`;
  } else {
    main = `<div class="exam-activity-head"><div><h2>Synopsis hjælp</h2><p>Problemformulering, struktur, metode og kilder.</p></div><button type="button" class="btn-primary" data-exam-activity-tab-jump="template">Åbn skabelon</button></div>
      <div class="exam-activity-panel"><h4>Dit materiale</h4><div class="exam-material-row">
        <label class="exam-material-drop"><input type="file" data-exam-synopsis-pdf accept=".pdf,application/pdf"><span>☁️</span><b>Upload PDF</b><small>${examData.synopsisPdf?.name ? `Klar: ${escapeHtml(examData.synopsisPdf.name)}` : 'Træk og slip din fil her eller klik for at vælge'}</small></label>
        <div class="exam-material-or">eller</div>
        <div class="exam-material-card" style="text-align:left"><h4 style="margin:0 0 8px;font-size:12px">Vælg fra dine noter</h4>${renderExamPrepSubjectsInline('examSynopsisSubjects')}</div>
      </div></div>
      <div class="exam-activity-panel"><h4>Kom godt i gang</h4><div class="exam-steps-row">
        <article class="exam-step-card"><em>1</em><span class="step-icon">📖</span><b>Læs materialet</b><small>Find centrale pointer i pensum</small></article>
        <article class="exam-step-card"><em>2</em><span class="step-icon">✏️</span><b>Find hovedpointer</b><small>Sortér det vigtigste</small></article>
        <article class="exam-step-card"><em>3</em><span class="step-icon">📝</span><b>Skriv din synopsis</b><small>Brug skabelonen</small></article>
        <article class="exam-step-card"><em>4</em><span class="step-icon">✓</span><b>Tjek og rediger</b><small>Struktur og kilder</small></article>
        <article class="exam-step-card"><em>5</em><span class="step-icon">📤</span><b>Brug din synopsis</b><small>Til eksamen eller opgave</small></article>
      </div></div>
      <div class="exam-template-grid exam-template-compact" style="margin-top:16px">
        <form class="exam-template-form" data-synopsis-draft>
          <h5 style="margin:0 0 12px;font-size:13px">Skabelon</h5>
          ${synopsisDraftFieldsHtml(draft)}
        </form>${synopsisExampleHtml()}
      </div>
      <div class="synopsis-cta-banner"><p>✨ Klar til at lave din synopsis? Udfyld skabelonen og generér AI-vejledning.</p><button type="button" class="btn-primary" data-generate-synopsis-guide>Generér vejledning</button></div>`;
  }
  return examActivityShell('synopsis', tab, nav, main, { sidebarInfo: synopsisSidebarInfo(), tip: 'Start med problemstillingen – resten følger naturligt.' });
}

function renderPensumkortActivity(tab) {
  const subjects = examData.subjects || [];
  const nav = [
    examActivityNavItem('overview', '▦', 'Overblik', 'Hele dit pensum', tab === 'overview'),
    examActivityNavItem('topics', '▤', 'Emner', 'Opdelt i emner', tab === 'topics'),
    examActivityNavItem('timeline', '◷', 'Tidslinje', 'Din plan og deadlines', tab === 'timeline'),
  ].join('');
  let main = '';
  if (!examData.plan?.length) {
    main = `<div class="exam-activity-head"><div><h2>Pensumkort</h2><p>Du skal have en eksamensplan først.</p></div></div>${renderExamPrepSubjectsInline()}`;
  } else if (tab === 'topics') {
    const topics = subjects.flatMap(subject => (subject.topics || []).map(topic => ({ topic, subject: subject.name, subjectId: subject.id })));
    const topicIcons = ['🔬', '⚡', '🧬', '🛡️', '🔭'];
    main = `<div class="exam-activity-head"><div><h2>Emner</h2><p>${topics.length} pensumemner på tværs af dine fag.</p></div></div>
      <div class="exam-topic-grid">${topics.length ? topics.map((item, index) => `<article class="exam-topic-card"><span>${topicIcons[index % 5]}</span><b>${escapeHtml(item.topic)}</b><small>${escapeHtml(item.subject)}</small></article>`).join('') : '<div class="empty-list">Tilføj emner via eksamensplanen.</div>'}</div>`;
  } else if (tab === 'timeline') {
    const days = (examData.plan || []).slice(0, 14);
    main = `<div class="exam-activity-head"><div><h2>Tidslinje</h2><p>De næste planlagte læseopgaver.</p></div></div>
      ${days.length ? days.map(day => `<details class="plan-day" ${day.date === days[0]?.date ? 'open' : ''}><summary><span>${formatDate(`${day.date}T12:00:00`)}</span><span>${day.tasks.length} opgaver</span></summary><div class="plan-body">${day.tasks.map(task => `<label class="plan-task ${examData.checks[task.id] ? 'completed' : ''}"><input type="checkbox" data-exam-check="${task.id}" ${examData.checks[task.id] ? 'checked' : ''}><span><b>${escapeHtml(task.subject)}</b> · ${escapeHtml(task.topic)}</span></label>`).join('')}</div></details>`).join('') : '<div class="empty-list">Generér en eksamensplan først.</div>'}`;
  } else {
    const firstSubject = subjects[0];
    const allTasks = (examData.plan || []).flatMap(day => day.tasks || []);
    const done = allTasks.filter(task => examData.checks[task.id]).length;
    const pct = allTasks.length ? Math.round(done / allTasks.length * 100) : 0;
    const topicIcons = ['🔬', '⚡', '🧬', '🛡️', '🔭'];
    const topics = firstSubject ? (firstSubject.topics || []).map((topic, i) => {
      const topicTasks = allTasks.filter(t => t.subject === firstSubject.name && t.topic === topic);
      const topicDone = topicTasks.filter(t => examData.checks[t.id]).length;
      const topicPct = topicTasks.length ? Math.round(topicDone / topicTasks.length * 100) : 0;
      return { topic, done: topicDone, total: topicTasks.length, pct: topicPct, icon: topicIcons[i % 5] };
    }) : [];
    const upcomingDays = (examData.plan || []).slice(0, 3).flatMap(day =>
      (day.tasks || []).filter(t => !examData.checks[t.id]).slice(0, 1).map(task => ({ ...task, date: day.date }))
    ).slice(0, 3);
    main = `<div class="exam-activity-head"><div><h2>Pensumkort</h2><p>Her får du det store overblik over dit hele pensum.</p></div><button type="button" class="btn-outline">Tilføj note ✏️</button></div>
      ${firstSubject ? `<div class="pensum-hero"><div class="pensum-hero-info"><span class="book-icon">📗</span><div><b>${escapeHtml(firstSubject.name)}</b><small>${done} / ${allTasks.length} kort gennemgået · ${pct}%</small><div class="exam-set-progress" style="width:200px;margin-top:8px"><i style="width:${pct}%"></i></div></div></div><span style="font-size:40px">📋</span></div>` : ''}
      <h4 style="margin:0 0 12px;font-size:14px">Dit pensum overblik</h4>
      <div class="exam-topic-scroll">${topics.length ? topics.map((item, i) => `<article class="exam-topic-card ${i === 0 ? 'active' : ''}" data-open-pensum-subject="${firstSubject?.id}"><span>${item.icon}</span><b>${escapeHtml(item.topic)}</b><small>${item.done} / ${item.total} kort</small><div class="exam-set-progress"><i style="width:${item.pct}%"></i></div></article>`).join('') : subjects.map((subject, index) => `<article class="exam-topic-card" data-open-pensum-subject="${subject.id}"><span>${['📘','🧪','🌍'][index % 3]}</span><b>${escapeHtml(subject.name)}</b><small>${subject.topics.length} emner</small></article>`).join('')}</div>
      <div class="pensum-bottom-grid">
        <div class="exam-plan-card"><h4>Din studieplan</h4><div class="pensum-plan-list">${upcomingDays.length ? upcomingDays.map(item => `<div class="pensum-plan-item"><div><span class="date">I dag ${formatDate(`${item.date}T12:00:00`)}</span><b>${escapeHtml(item.topic)}</b><small>${escapeHtml(item.subject)}</small></div><button type="button" class="btn-outline" style="font-size:10px;padding:6px 10px">Fortsæt →</button></div>`).join('') : '<p class="hint">Ingen opgaver i dag.</p>'}<button type="button" class="btn-outline" style="margin-top:10px;width:100%">Se hele tidslinje 📅</button></div></div>
        <div><div class="pensum-sticky"><h5>Husk til eksamen</h5>
          <label><input type="checkbox" checked> Forstå figurer og processer</label>
          <label><input type="checkbox" checked> Kunne forklare med egne ord</label>
          <label><input type="checkbox"> Øve gamle eksamensspørgsmål</label>
          <label><input type="checkbox"> Bruge eksempler i svar</label>
        </div><div class="pensum-stats-box"><h5>📊 Statistik</h5><p>Gennemgåede kort: ${done}/${allTasks.length}</p><p>Korrekte svar: ${pct > 0 ? Math.min(99, pct + 40) : 0}%</p><p>Sidst trænet: I dag</p></div></div>
      </div>`;
  }
  return examActivityShell('curriculum', tab, nav, main, { tip: 'Brug farver og ikoner til at få et bedre overblik over vigtige emner.' });
}

function renderRepeatActivity(tab) {
  const allCards = getFlashcardSets().flatMap(set => set.cards.map(card => ({ ...card, setName: set.name })));
  const buckets = { now: allCards.slice(0, 3), soon: allCards.slice(3, 8), later: allCards.slice(8, 18), much: allCards.slice(18, 27), mastered: allCards.slice(27) };
  const todayCount = buckets.now.length + buckets.soon.length;
  const nav = [
    examActivityNavItem('overview', '↻', 'Overblik', 'Dagens repetition', tab === 'overview'),
    examActivityNavItem('today', '◷', 'Dagens kort', `${todayCount} kort klar`, tab === 'today'),
  ].join('');
  const bucketLabels = [
    { key: 'now', label: 'Lige nu', count: buckets.now.length, color: '#e87878', desc: '' },
    { key: 'soon', label: 'Snart', count: buckets.soon.length, color: '#f0a858', desc: 'Om 1-2 dage' },
    { key: 'later', label: 'Senere', count: buckets.later.length, color: '#78c878', desc: 'Om 3-7 dage' },
    { key: 'much', label: 'Langt senere', count: buckets.much.length, color: '#78a8e8', desc: 'Om +7 dage' },
    { key: 'mastered', label: 'Mesteret', count: buckets.mastered.length, color: '#a878d8', desc: 'Sidst set perfekt' },
  ];
  const displayCards = tab === 'today' ? [...buckets.now, ...buckets.soon] : buckets.now;
  const badgeFor = (card) => {
    const idx = allCards.indexOf(card);
    if (idx < 3) return 'now';
    if (idx < 8) return 'soon';
    return 'later';
  };
  const badgeLabel = { now: 'Lige nu', soon: 'Snart', later: 'Senere' };
  const main = `<div class="exam-activity-head"><div><h2>Repetitionshjul</h2><p>Vi viser dig kortene, lige før du glemmer dem.</p></div><button type="button" class="btn-outline">⚙ Indstillinger</button></div>
    <div class="exam-stats-row">
      <article class="exam-stat-card pink"><span class="stat-icon">📅</span><strong>${todayCount || 12}</strong><span>Kort i dag · Anbefalet til repetition</span></article>
      <article class="exam-stat-card yellow"><span class="stat-icon">⏱</span><strong>${Math.max(1, todayCount * 2) || 24} min</strong><span>Estimeret tid · For alle dagens kort</span></article>
      <article class="exam-stat-card green"><span class="stat-icon">✓</span><strong>78%</strong><span>Husket rigtigt · Seneste 7 dage</span></article>
      <article class="exam-stat-card blue"><span class="stat-icon">🔥</span><strong>56</strong><span>Dages stime · Godt gået!</span></article>
    </div>
    <div class="repeat-donut-wrap">
      <div><div class="repeat-donut"><div class="repeat-donut-center"><b>I dag<br><strong style="font-size:22px;color:var(--exam-accent)">${todayCount || 12}</strong><br>kort klar til repetition</b></div></div></div>
      <div><h4 style="margin:0 0 12px;font-size:14px">Dine kort fordelt i repetitionshjulet</h4>
        <div class="repeat-bucket-labels">${bucketLabels.map(b => `<div class="repeat-bucket-label"><span class="dot" style="background:${b.color}"></span><b>${b.label}</b> · ${b.count} kort${b.desc ? ` <small>(${b.desc})</small>` : ''}</div>`).join('')}</div>
        <div class="exam-activity-panel" style="margin-top:16px"><h4>Sådan virker det</h4><p style="font-size:11px;color:#6a6080;line-height:1.5">Repetitionshjulet viser dig kort lige før du glemmer dem. Jo bedre du husker et kort, jo længere tid går der mellem gentagelserne.</p><a href="#" style="color:var(--exam-accent);font-size:11px">Læs mere →</a></div>
      </div>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin:20px 0 12px"><h4 style="margin:0;font-size:14px">Dagens kort (${displayCards.length || todayCount || 12})</h4><div style="display:flex;gap:8px"><select style="padding:6px 10px;border-radius:8px;border:1px solid #ece8f4;font-size:11px"><option>Sortér: Anbefalet</option></select><button type="button" class="btn-primary" data-start-repeat-training>▶ Start repetition</button></div></div>
    ${displayCards.length ? displayCards.map(card => `<div class="repeat-card-row"><span>📗</span><div><b>${escapeHtml(card.setName || 'Flashcards')}</b><small>${escapeHtml(card.front)}</small></div><span class="badge ${badgeFor(card)}">${badgeLabel[badgeFor(card)]}</span><button type="button" class="btn-outline" style="font-size:10px;padding:6px 12px" data-start-repeat-training>Start</button></div>`).join('') : '<p class="hint">Opret flashcards eller en eksamensplan for at fylde repetitionshjulet.</p>'}
    <div id="examActivityQuiz" class="exam-activity-quiz"></div>`;
  return examActivityShell('repeat', tab, nav, main, { tip: 'Kort du glemmer kommer tilbage oftere – det er meningen!' });
}

function renderProgressActivity(tab) {
  const results = examData.trainingResults || [];
  const nav = [examActivityNavItem('overview', '▥', 'Overblik', 'Point og udvikling', true)].join('');
  const avg = results.length ? Math.round(results.reduce((sum, item) => sum + (item.score || 0), 0) / results.length) : 0;
  const main = `<div class="exam-activity-head"><div><h2>Resultater</h2><p>Point, fejltyper og udvikling.</p></div></div>
    <div class="exam-stats-row">
      <article class="exam-stat-card"><strong>${rewardData.points}</strong><span>Point</span></article>
      <article class="exam-stat-card"><strong>${results.length}</strong><span>Træninger</span></article>
      <article class="exam-stat-card"><strong>${avg || '–'}</strong><span>Gns. score</span></article>
      <article class="exam-stat-card"><strong>${rewardDiscount()}%</strong><span>Rabat</span></article>
    </div>
    <div class="exam-activity-panel"><h4>Seneste træninger</h4>${results.length ? [...results].reverse().slice(0, 12).map(item => `<p><b>${formatDate(item.date)}</b> · ${item.score}/10 · ${escapeHtml(item.readiness || 'Træning')}</p>`).join('') : '<p class="hint">Ingen resultater endnu. Start en træning fra et af værktøjerne.</p>'}</div>
    <div class="reward-strip" id="rewardStripActivity"></div>`;
  setTimeout(() => { const strip = $('#rewardStripActivity'); if (strip) { renderRewardStrip(); strip.innerHTML = $('#rewardStrip')?.innerHTML || ''; } }, 0);
  return examActivityShell('progress', tab, nav, main);
}

function renderExamGuideActivity(mode) {
  const guideMode = mode;
  const guideTitles = { synopsis: 'Synopsis hjælp', oral: 'Mundtlig eksamen', written: 'Skriftlig eksamen' };
  const guideIcons = { synopsis: '¶', oral: '◯', written: 'Aa' };
  const guideSubtitles = {
    synopsis: 'Problemformulering, struktur, metode og kilder',
    oral: 'Disposition, hjælpemidler og oplæg',
    written: 'Tidsplan, opgavetyper og kvalitetstjek',
  };
  const nav = [examActivityNavItem('guide', guideIcons[guideMode] || '¶', guideTitles[guideMode] || 'Vejledning', 'Generér vejledning', true)].join('');
  const main = `<div class="exam-activity-head"><div><h2>${escapeHtml(guideTitles[guideMode] || 'Vejledning')}</h2><p>${escapeHtml(guideSubtitles[guideMode] || '')}</p></div><button type="button" class="btn-primary" data-generate-exam-guide="${guideMode}">Generér vejledning</button></div>
    ${renderExamPrepSubjectsInline()}
    <div class="exam-activity-panel"><h4>Materiale fra din plan</h4><p class="hint">Vælg de fag, vejledningen skal bygge på. Indhold genereres først, når du trykker på knappen.</p></div>
    <div id="examActivityQuiz" class="exam-activity-quiz"></div>`;
  return `<div class="exam-activity-shell" data-exam-activity="${guideMode}">
    <aside class="exam-activity-sidebar">
      <button type="button" class="exam-activity-back" data-exam-activity-back>← Tilbage til oversigt</button>
      <div class="exam-activity-brand"><span>${guideIcons[guideMode] || '¶'}</span><h3>${escapeHtml(guideTitles[guideMode] || 'Vejledning')}</h3><p>${escapeHtml(guideSubtitles[guideMode] || '')}</p></div>
      <nav class="exam-activity-nav">${nav}</nav>
      <div class="exam-activity-tip"><strong>Tip</strong>Indhold genereres ud fra dine valgte fag og noter – ikke på forhånd.</div>
    </aside>
    <main class="exam-activity-main" data-exam-activity-tab="guide">${main}</main>
  </div>`;
}

function renderTrainingActivity(preset, tab) {
  const meta = examActivityMeta[preset] || examActivityMeta.mixed;
  const nav = [
    examActivityNavItem('setup', meta.icon, 'Start træning', 'Vælg fag og begynd', tab === 'setup'),
    examActivityNavItem('session', '▶', 'Test i gang', 'Aktiv træning', tab === 'session'),
  ].join('');
  const modeMap = { oral: 'written', speed: 'flashcards', flashcards: 'flashcards', quiz: 'mixed', mock: 'mixed', weak: 'weak', mixed: 'mixed' };
  const trainingMode = modeMap[preset] || 'mixed';
  const main = `<div class="exam-activity-head"><div><h2>${escapeHtml(meta.title)}</h2><p>${escapeHtml(meta.subtitle)}</p></div>${preset === 'oral' ? '' : `<button type="button" class="btn-primary" data-start-training="${preset}">Start ${preset === 'mock' ? 'prøveeksamen' : 'træning'}</button>`}</div>
    ${preset === 'oral' ? `<div class="exam-activity-panel"><h4>Hvad emne trak jeg?</h4><div class="drawn-topic-controls"><input id="drawnExamTopicActivity" placeholder="Fx Fourier transformation, EU ret eller proteinsyntese" value="${escapeHtml(examData.drawnTopic || '')}"><button type="button" class="btn-primary" id="findDrawnTopicNotesActivity">Find mine noter</button></div><div id="drawnTopicNotesResultActivity" class="drawn-topic-results"></div></div>` : ''}
    <div class="exam-activity-panel"><h4>Vælg fag</h4>${renderExamPrepSubjectsInline('examTrainingSubjects')}
      <input type="hidden" name="examTrainingModeActivity" value="${trainingMode}">
      <div class="exam-activity-actions"><button type="button" class="btn-primary" data-start-training="${preset}">▶ Start træning</button></div>
    </div>
    <div id="examActivityQuiz" class="exam-activity-quiz"></div>`;
  return examActivityShell(preset, tab, nav, main);
}

function renderExamSubjectCards() {
  const host = $('#examSubjectCards');
  if (!host) return;
  const subjects = examData.subjects || [];
  if (!subjects.length || !examData.plan?.length) {
    host.innerHTML = '';
    return;
  }
  host.innerHTML = subjects.map((subject, index) => {
    const tasks = (examData.plan || []).flatMap(day => day.tasks || []).filter(task => task.subject === subject.name);
    const done = tasks.filter(task => examData.checks[task.id]).length;
    const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const remaining = Math.ceil((new Date(`${subject.date}T12:00:00`) - new Date()) / 86400000);
    const urgent = remaining >= 0 && remaining <= 10;
    return `<button type="button" class="exam-subject-card ${urgent ? 'urgent' : ''}" data-open-exam-subject="${subject.id}"><span>${['📘', '🧪', '🌍', '📐'][index % 4]}</span><b>${escapeHtml(subject.name)}</b><small>Eksamen ${formatDate(`${subject.date}T12:00:00`)}${urgent ? ` · ${remaining === 0 ? 'i dag' : `${remaining} dage`}` : ''}</small><div class="exam-set-progress"><i style="width:${pct}%"></i></div><small>${done}/${tasks.length} opgaver · ${pct}%</small></button>`;
  }).join('');
}

function openExamPlanSubject(subjectId, tab = 'plan') {
  selectedExamPlanSubject = subjectId;
  selectedExamPlanTab = tab;
  setExamDialogMode(true);
  renderExamPlanWorkspace();
}

function backToExamPlanOverview() {
  setExamDialogMode(false);
  const workspace = $('#examPlanWorkspace');
  if (workspace) workspace.innerHTML = '';
  renderExamPlanDashboard();
}

function closeExamPlanSubject() {
  selectedExamPlanSubject = null;
  selectedExamPlanTab = 'plan';
  backToExamPlanOverview();
}

function renderExamPlanWorkspace() {
  const host = $('#examPlanWorkspace');
  const subject = (examData.subjects || []).find(item => item.id === selectedExamPlanSubject);
  if (!host || !subject) return;
  const tasks = (examData.plan || []).flatMap(day => (day.tasks || []).map(task => ({ ...task, date: day.date }))).filter(task => task.subject === subject.name);
  const done = tasks.filter(task => examData.checks[task.id]).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const remaining = Math.ceil((new Date(`${subject.date}T12:00:00`) - new Date()) / 86400000);
  const days = (examData.plan || []).map(day => ({ ...day, tasks: (day.tasks || []).filter(task => task.subject === subject.name) })).filter(day => day.tasks.length);
  const nav = [
    examActivityNavItem('plan', '▦', 'Læseoversigt', 'Dag for dag', selectedExamPlanTab === 'plan'),
    examActivityNavItem('calendar', '◷', 'Kalender', 'Kun dette fag', selectedExamPlanTab === 'calendar'),
    examActivityNavItem('info', '▤', 'Faginfo', 'Pensum og filer', selectedExamPlanTab === 'info'),
  ].join('');
  let main = `<div class="exam-plan-subject-head"><div><h3>${escapeHtml(subject.name)}</h3><p>Eksamen ${formatDate(`${subject.date}T12:00:00`)}${remaining >= 0 ? ` · ${remaining === 0 ? 'i dag' : `${remaining} dage tilbage`}` : ''}</p></div><div class="exam-plan-subject-actions"><b>${done}/${tasks.length} · ${pct}%</b><button type="button" class="exam-row-delete" data-delete-exam-subject="${subject.id}" title="Slet ${escapeHtml(subject.name)}">×</button></div></div>`;
  if (selectedExamPlanTab === 'calendar') {
    const filteredPlan = (examData.plan || []).map(day => ({ ...day, tasks: (day.tasks || []).filter(task => task.subject === subject.name) }));
    main += `<div id="examSubjectPlanView">${renderExamCalendar(filteredPlan)}</div>`;
  } else if (selectedExamPlanTab === 'info') {
    const noteSubject = data.subjects.find(item => item.id === subject.subjectId);
    const noteCount = noteSubject ? data.pages.filter(page => page.subjectId === noteSubject.id).length : 0;
    main += `<div class="exam-activity-panel"><h4>Pensum og materiale</h4>
      <p><b>Kilde:</b> ${subject.source === 'files' ? 'Uploadet litteratur' : subject.source === 'both' ? 'Noter + litteratur' : 'Dine noter'}</p>
      <p><b>Emner:</b> ${subject.topics.length ? subject.topics.map(topic => escapeHtml(topic)).join(', ') : 'Ingen emner endnu'}</p>
      <p><b>Noter:</b> ${noteCount}</p>
      ${subject.files?.length ? `<p><b>PDF-filer:</b> ${subject.files.map(file => escapeHtml(file.name)).join(', ')}</p>` : ''}
    </div>`;
  } else {
    main += `<div class="exam-tools"><div class="exam-view-switch" role="group"><button type="button" class="btn-outline active">Læseoversigt</button></div><button type="button" class="btn-outline" data-regenerate-subject-plan="${subject.id}">Opdatér plan</button></div>
      <div class="exam-progress"><div style="width:${pct}%"></div></div>
      <div id="examSubjectPlanView">${days.length ? days.map((day, index) => `<details class="plan-day ${index === 0 ? 'today-plan' : ''}" ${index === 0 ? 'open' : ''}><summary><span><small>${new Date(`${day.date}T12:00:00`).toLocaleDateString('da-DK', { weekday: 'long' })}</small>${formatDate(`${day.date}T12:00:00`)}</span><span>${day.tasks.filter(task => examData.checks[task.id]).length}/${day.tasks.length}</span></summary><div class="plan-body">${day.tasks.map(task => renderPlanTaskRow(task)).join('')}</div></details>`).join('') : '<div class="empty-list">Ingen opgaver for dette fag endnu. Generér planen igen.</div>'}</div>`;
  }
  host.innerHTML = `<div class="exam-activity-shell" data-exam-plan-subject="${subject.id}">
    <aside class="exam-activity-sidebar">
      <div class="exam-activity-sidebar-top">
        <button type="button" class="exam-activity-back" data-exam-plan-back>← Tilbage til oversigt</button>
        <button type="button" class="exam-activity-close" data-close="exam" title="Luk">×</button>
      </div>
      <div class="exam-activity-brand"><span>📅</span><h3>${escapeHtml(subject.name)}</h3><p>Din plan for dette fag – adskilt fra andre fag.</p></div>
      <nav class="exam-activity-nav">${nav}</nav>
      <div class="exam-activity-tip"><strong>Tip</strong>Hold fag adskilt, så du undgår at blande kemi og matematik i samme tjekliste.</div>
    </aside>
    <main class="exam-activity-main">${main}</main>
  </div>`;
}

function startExamActivityTraining(preset) {
  selectedExamPreset = preset;
  const modeMap = { oral: 'written', speed: 'flashcards', flashcards: 'flashcards', quiz: 'mixed', mock: 'mixed', weak: 'weak', mixed: 'mixed', repeat: 'flashcards' };
  const radioValue = modeMap[preset] || 'mixed';
  const radio = document.querySelector(`input[name="examTrainingMode"][value="${radioValue}"]`);
  if (radio) radio.checked = true;
  generateExamPreparation();
}

function openFlashcardEditor(setId) {
  const sets = getFlashcardSets();
  const set = sets.find(item => item.id === setId);
  if (!set || set.derived) return alert('Gem sættet først ved at generere fra noter.');
  const saved = (examData.flashcardSets || []).find(item => item.id === setId);
  if (!saved) return alert('Kun gemte sæt kan redigeres.');
  const dialog = document.createElement('dialog');
  dialog.className = 'flashcard-edit-dialog';
  dialog.innerHTML = `<form class="modal"><div class="modal-head"><h2>Rediger flashcards · ${escapeHtml(set.name)}</h2><button type="button" class="modal-close" data-close-fc-edit>×</button></div>
    <p class="hint">Kort er genereret fra dine noter. Tilpas spørgsmål og svar før træning.</p>
    <div class="fc-edit-list">${saved.cards.map((card, index) => `<article class="fc-edit-card"><label>Spørgsmål ${index + 1}${card.sourcePage ? ` <small>· fra «${escapeHtml(card.sourcePage)}»</small>` : ''}</label><input name="front-${index}" value="${escapeHtml(card.front || '')}"><label>Svar</label><textarea name="back-${index}" rows="2">${escapeHtml(card.back || '')}</textarea></article>`).join('')}</div>
    <div class="modal-actions"><button type="button" class="btn-outline" data-close-fc-edit>Annuller</button><button type="submit" class="btn-primary">Gem kort</button></div></form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-close-fc-edit]')) { dialog.close(); dialog.remove(); }
  });
  dialog.querySelector('form')?.addEventListener('submit', event => {
    event.preventDefault();
    saved.cards = saved.cards.map((card, index) => ({
      ...card,
      front: dialog.querySelector(`[name="front-${index}"]`)?.value.trim() || card.front,
      back: dialog.querySelector(`[name="back-${index}"]`)?.value.trim() || card.back,
    }));
    saveExamData();
    dialog.close();
    dialog.remove();
    renderExamActivityWorkspace();
  });
  dialog.showModal();
}

function createFlashcardsFromSelectedNotes() {
  const picker = $('#fcNotePicker');
  if (picker?.value) {
    const subject = examData.subjects.find(s => s.id === picker.value);
    if (subject) {
      const noteSubject = data.subjects.find(item => item.id === subject.subjectId);
      const pages = noteSubject ? data.pages.filter(page => page.subjectId === noteSubject.id) : [];
      const cards = pages.flatMap(page => extractNoteSections(page).map(section => ({
        front: section.title,
        back: section.text.slice(0, 280),
        sourcePage: page.title || 'Uden titel',
        sourcePageId: page.id,
      }))).filter(card => card.front);
      if (!cards.length) return alert('Ingen noter fundet for dette fag.');
      const existing = (examData.flashcardSets || []).findIndex(set => set.subjectId === subject.id);
      const record = { id: uid(), name: subject.name, subjectId: subject.id, cards, createdAt: new Date().toISOString(), lastStudied: null, progress: 0 };
      if (existing >= 0) examData.flashcardSets[existing] = record;
      else examData.flashcardSets.push(record);
      saveExamData();
      openExamActivity('flashcards', 'sets');
      return;
    }
  }
  const ids = [...document.querySelectorAll('#examFlashcardSubjects input:checked, #examActivitySubjects input:checked, #examTrainingSubjects input:checked')].map(input => input.value);
  const subjects = examData.subjects.filter(subject => ids.includes(subject.id));
  if (!subjects.length) return alert('Vælg mindst ét fag.');
  subjects.forEach(subject => {
    const noteSubject = data.subjects.find(item => item.id === subject.subjectId);
    const pages = noteSubject ? data.pages.filter(page => page.subjectId === noteSubject.id) : [];
    const cards = pages.flatMap(page => extractNoteSections(page).map(section => ({
      front: section.title,
      back: section.text.slice(0, 280),
      sourcePage: page.title || 'Uden titel',
      sourcePageId: page.id,
    }))).filter(card => card.front);
    if (!cards.length) return;
    const existing = (examData.flashcardSets || []).findIndex(set => set.subjectId === subject.id);
    const record = { id: uid(), name: subject.name, subjectId: subject.id, cards, createdAt: new Date().toISOString(), lastStudied: null, progress: 0 };
    if (existing >= 0) examData.flashcardSets[existing] = record;
    else examData.flashcardSets.push(record);
  });
  saveExamData();
  openExamActivity('flashcards', 'sets');
}

function plainNoteText(page) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = page.sheets?.length ? page.sheets.join(' ') : (page.html || '');
  return (wrapper.textContent || '').replace(/\s+/g, ' ').trim();
}

function findNotesForDrawnTopic() {
  const input = $('#drawnExamTopic');
  const host = $('#drawnTopicNotesResult');
  const query = input?.value.trim() || '';
  if (!host) return;
  if (query.length < 2) {
    host.innerHTML = '<p class="hint">Skriv mindst to tegn fra det emne, du trak.</p>';
    input?.focus();
    return;
  }
  const normalizedQuery = query.toLocaleLowerCase('da');
  const terms = normalizedQuery.split(/\s+/).filter(term => term.length > 1);
  const results = data.pages.map(page => {
    const subject = data.subjects.find(item => item.id === page.subjectId);
    const body = plainNoteText(page);
    const title = `${subject?.name || ''} ${page.title || ''}`.toLocaleLowerCase('da');
    const haystack = `${title} ${body.toLocaleLowerCase('da')}`;
    let score = title.includes(normalizedQuery) ? 40 : haystack.includes(normalizedQuery) ? 24 : 0;
    terms.forEach(term => {
      if (title.includes(term)) score += 8;
      score += Math.min(5, haystack.split(term).length - 1);
    });
    return { page, subject, body, score };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  examData.drawnTopic = query;
  saveExamData();
  host.innerHTML = results.length ? results.map(({ page, subject, body, score }) => {
    const lowerBody = body.toLocaleLowerCase('da');
    const firstTerm = terms.find(term => lowerBody.includes(term));
    const start = firstTerm ? Math.max(0, lowerBody.indexOf(firstTerm) - 65) : 0;
    const excerpt = body.slice(start, start + 220);
    return `<button type="button" class="drawn-topic-note" data-open-drawn-note="${page.id}">
      <span>${escapeHtml(subject?.name || 'Note')}</span>
      <b>${escapeHtml(page.title || 'Uden titel')}</b>
      <small>${start ? '…' : ''}${escapeHtml(excerpt)}${body.length > start + 220 ? '…' : ''}</small>
      <i>${Math.min(100, score * 2)}% relevans</i>
    </button>`;
  }).join('') : '<div class="empty-list">Ingen noter matcher endnu. Prøv et kortere fagbegreb eller et synonym.</div>';
}

let translateSourceText = '';
let translateResultHtml = '';

function openTranslateDialog(text) {
  translateSourceText = text || '';
  translateResultHtml = '';
  const result = $('#translateResult');
  if (result) result.innerHTML = '';
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('selected'));
  const doBtn = $('#doTranslate');
  if (doBtn) { doBtn.disabled = true; doBtn.textContent = 'Oversæt'; }
  $('#translateActions')?.classList.remove('hidden');
  $('#translateInsertActions')?.classList.add('hidden');
  $('#translateDialog')?.showModal();
}

function saveRewards() {
  if (isGuest()) return;
  const serialized = JSON.stringify(rewardData);
  localStorage.setItem('noteit-rewards', serialized);
  const email = activeAccountEmail();
  if (email) localStorage.setItem(accountStorageKey(email, 'rewards'), serialized);
}

function rewardDiscount() {
  return Math.min(30, Math.floor(rewardData.points / 10) * 2);
}

function renderRewardStrip() {
  const host = $('#rewardStrip');
  if (!host) return;
  host.innerHTML = `<div><b>${rewardData.points} studieklip</b><span>${nextRewardHint()} · ${rewardDiscount()}% mulig abonnementsrabat</span></div>
    <button type="button" class="btn-outline" data-open-rewards>Point & rabat</button>`;
}

function openRewardsPanel() {
  const codeUsed = rewardData.codes.includes('NOTED-STAFF-LIFETIME');
  const dialog = document.createElement('dialog');
  dialog.className = 'reward-dialog';
  dialog.innerHTML = `<div class="modal"><div class="modal-head"><div><span class="engineering-tag">NOTE'IT FORDELE</span><h2>Dine point</h2></div><button class="modal-close" data-close-reward>×</button></div>
    <div class="reward-total"><strong>${rewardData.points}</strong><span>point</span></div>
    <p>Hver 10 point giver 2% rabat. Du har lige nu optjent op til <b>${rewardDiscount()}%</b>.</p>
    <div class="field"><label>Rabatkode</label><div class="code-row"><input id="rewardCode" placeholder="Indtast kode" ${codeUsed ? 'disabled' : ''}><button class="btn-outline" data-apply-code ${codeUsed ? 'disabled' : ''}>${codeUsed ? 'Aktiveret' : 'Aktivér'}</button></div></div>
    <div class="subscription-card"><div><b>Note'it Premium</b><span>Point kan vælges som rabat ved et fremtidigt køb.</span></div><button class="btn-primary" data-use-points>Brug ${rewardDiscount()}%</button></div>
    <p class="hint">Dette er et lokalt belønningssystem. Et rigtigt abonnement kræver senere betalingstjeneste og servervalidering.</p></div>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-close-reward]')) { dialog.close(); dialog.remove(); }
    if (event.target.closest('[data-apply-code]')) {
      const code = $('#rewardCode').value.trim().toUpperCase();
      if (code !== 'NOTED-STAFF-LIFETIME' || rewardData.codes.includes(code)) return alert('Koden er ugyldig eller allerede brugt.');
      rewardData.points += 50;
      rewardData.codes.push(code);
      saveRewards();
      alert('Grundlæggerkoden er aktiveret: +50 point.');
      dialog.close(); dialog.remove(); renderRewardStrip(); renderProfileStatus();
    }
    if (event.target.closest('[data-use-points]')) alert(`Ved checkout kan ${rewardDiscount()}% vælges som rabat. Point trækkes først, når et rigtigt betalingsflow tilsluttes.`);
  });
  dialog.showModal();
}

function extractNoteSections(page) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = page.sheets?.length ? page.sheets.join('') : (page.html || '');
  const sections = [];
  let current = { title: page.title || 'Noten', text: '', pageTitle: page.title || 'Noten' };
  [...wrapper.children].forEach(node => {
    if (/^H[1-4]$/.test(node.tagName)) {
      if (current.text.trim()) sections.push(current);
      current = { title: node.textContent.trim() || page.title || 'Afsnit', text: '', pageTitle: page.title || 'Noten' };
    } else {
      current.text += ` ${node.textContent || ''}`;
    }
  });
  if (current.text.trim()) sections.push(current);
  return sections.map(section => ({
    ...section,
    text: section.text.replace(/\s+/g, ' ').trim(),
    words: section.text.trim().split(/\s+/).filter(Boolean).length,
  })).filter(section => section.text);
}

function buildExamQuestions(subjects, mode) {
  const questions = [];
  subjects.forEach(subject => {
    const notePages = data.pages.filter(page => page.subjectId === subject.subjectId);
    const noteSections = notePages.flatMap(page => extractNoteSections(page));
    const fallback = (subject.topics || []).map(topic => ({ title: topic, text: topic, words: 1, pageTitle: subject.name }));
    const sourceSections = noteSections.length ? noteSections : fallback;
    const weakSections = sourceSections.filter(section => section.words < 35);
    const selectedSections = mode === 'weak' && weakSections.length ? weakSections : sourceSections;
    (subject.questions || []).forEach(prompt => questions.push({
      id: uid(), type: 'written', subject: subject.name, prompt, answer: '',
      explanation: `Brug præcise begreber fra dine noter og kilder i ${subject.name}, forklar sammenhængen og giv et relevant eksempel.`,
    }));
    selectedSections.slice(0, 8).forEach((section, index) => {
      const excerpt = section.text.slice(0, 300);
      if (mode === 'mixed' && index % 2 === 0) {
        const correct = excerpt.slice(0, 120) || section.title;
        questions.push({
          id: uid(), type: 'choice', subject: subject.name,
          prompt: section.title.includes('?') ? section.title : `Hvad er vigtigst at vide om "${section.title}"?`,
          answer: correct,
          options: makeChoiceOptions(correct, subject.name),
          explanation: `Byg svaret på noten "${section.pageTitle}": ${excerpt}`,
        });
      }
      questions.push({
        id: uid(), type: 'written', subject: subject.name,
        prompt: mode === 'weak'
          ? `Dine noter om “${section.title}” er korte. Uddyb begrebet, forklar sammenhængen og giv et eksempel.`
          : mode === 'flashcards'
            ? section.title
            : `Forklar “${section.title}” med egne ord, og forbind det med resten af ${subject.name}.`,
        answer: excerpt,
        explanation: mode === 'weak'
          ? `Sammenlign med pensum og udbyg noten. Din nuværende tekst har cirka ${section.words} ord.`
          : `Byg svaret på noten “${section.pageTitle}”: ${excerpt}`,
      });
      if (mode === 'mixed' && index < 3) questions.push({
        id: uid(), type: 'written', subject: subject.name,
        prompt: `Anvend “${section.title}” på et nyt eksempel eller en relevant problemstilling.`,
        answer: excerpt,
        explanation: 'Forklar først princippet, anvend det trin for trin, og vurder derefter resultatet.',
      });
    });
    (subject.literature || []).forEach(lit => {
      const sentences = (lit.text || '').match(/[^.!?;]{50,280}[.!?;]/g) || [];
      sentences.slice(0, 4).forEach(sentence => questions.push({
        id: uid(), type: 'written', subject: subject.name,
        prompt: `Forklar og perspektivér dette udsagn fra ${lit.name}: “${sentence.trim().slice(0, 140)}…”`,
        answer: sentence.trim(),
        explanation: `Svaret skal koble udsagnet til fagets øvrige begreber og tydeligt markere, hvad der kommer fra kilden.`,
      }));
    });
  });
  return questions.slice(0, 10);
}

function makeChoiceOptions(correct, subject) {
  const topicHints = (examData.subjects.find(item => item.name === subject)?.topics || []).slice(0, 4);
  const distractors = [
    ...topicHints.map(topic => `En central pointe om ${topic}`),
    `Et aspekt af ${subject} der ikke passer her`,
    `En misforståelse inden for ${subject}`,
    `En uddybning uden for opgavens fokus`,
  ].filter(d => d !== correct && !correct.includes(d.slice(0, 12))).slice(0, 3);
  while (distractors.length < 3) distractors.push(`Et andet perspektiv på ${subject}`);
  const options = [correct, ...distractors.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function renderExamQuiz() {
  const host = getExamQuizHost();
  if (!host || !activeExamQuiz) return;
  const quiz = activeExamQuiz;
  const question = quiz.questions[quiz.index];
  if (!question) {
    const average = quiz.scores.length ? Math.round(quiz.scores.reduce((sum, score) => sum + score, 0) / quiz.scores.length) : 0;
    const readiness = average >= 8 ? 'Stærkt grundlag' : average >= 5 ? 'På vej' : 'Kræver mere træning';
    if (!quiz.finished) {
      quiz.finished = true;
      examData.trainingResults.push({ date: new Date().toISOString(), score: average, readiness, subjects: quiz.subjectIds });
      if (paperTrainingState?.subject) {
        recordPaperTrainingSession(
          paperTrainingState.preset,
          paperTrainingState.subject,
          quiz.questions.length,
          average,
        );
      }
      const tasks = examData.plan.flatMap(day => day.tasks);
      const planComplete = tasks.length && tasks.every(task => examData.checks[task.id]);
      const rewardKey = `${examData.start}:${quiz.subjectIds.slice().sort().join(',')}`;
      if (planComplete && quiz.correct === quiz.questions.length && !examData.rewardedPeriods.includes(rewardKey)) {
        examData.rewardedPeriods.push(rewardKey);
        rewardData.points += 10;
        rewardData.earned += 10;
        saveRewards();
      }
      earnRewardPoints(REWARD_AMOUNTS.trainingDone, `training-${dayKey(new Date())}-${quiz.subjectIds.slice().sort().join(',')}`);
    }
    saveExamData();
    const accuracy = Math.round((quiz.correct / Math.max(1, quiz.questions.length)) * 100);
    host.innerHTML = `<div class="exam-result-pop"><div class="result-ring"><strong>${average}</strong><span>/ 10</span></div><h3>Min eksamensparathed</h3><p>${readiness}</p><div class="readiness-rubric"><div><span>Faglig præcision</span><b>${accuracy}%</b></div><div><span>Forklaring og sammenhæng</span><b>${average}/10</b></div><div><span>Aktiv genkaldelse</span><b>${quiz.correct} af ${quiz.questions.length}</b></div></div><small>Baseret kun på denne træning. Det er ikke en karakter eller et facit.</small><button class="btn-primary" data-restart-quiz>Prøv igen</button></div>`;
    renderRewardStrip();
    return;
  }

  const pct = Math.round((quiz.index / quiz.questions.length) * 100);
  const setName = quiz.setName || question.subject || 'Træning';
  const sourceMode = question.sourceMode || quiz.sourceMode || paperTrainingState?.sourceMode;
  const sourceBadge = sourceMode ? paperSourceBadge(sourceMode) : '';
  const isFlashcard = quiz.mode === 'flashcards';
  const isChoice = question.type === 'choice';

  if (isFlashcard) {
    const flipped = quiz.flipped ? ' flipped' : '';
    host.innerHTML = `<div class="quiz-session-head"><div><h2>Træning</h2><p>${escapeHtml(setName)} (${quiz.questions.length} kort)</p></div><div class="quiz-session-actions">${sourceBadge}<button type="button" class="btn-outline" data-quiz-leave>Forlad test ✕</button></div></div>
      <div class="quiz-stats-bar"><div><small>Kort ${quiz.index + 1} af ${quiz.questions.length}</small><div class="quiz-progress-bar" style="margin-top:6px"><i style="width:${pct}%"></i></div></div><span style="font-size:11px;font-weight:700;color:var(--exam-accent)">${pct}% færdig</span></div>
      <div class="fc-flip-card${flipped}" data-flip-card><span class="card-label">${quiz.flipped ? 'Bagside' : 'Spørgsmål'}</span><h3>${escapeHtml(question.prompt)}</h3>${quiz.flipped ? `<div class="card-answer">${escapeHtml(question.answer || question.explanation || '')}</div>` : '<p class="hint" style="margin-top:16px">💡 Klik på kortet for at se svaret</p>'}</div>
      ${quiz.flipped ? `<p style="text-align:center;font-size:12px;color:#6a6080;margin:12px 0">Hvor godt kendte du svaret?</p>
        <div class="confidence-grid">
          <button type="button" class="confidence-btn red" data-confidence="1"><span class="emoji">✕</span><b>Kunne det ikke</b><small>Prøv igen senere</small></button>
          <button type="button" class="confidence-btn orange" data-confidence="2"><span class="emoji">😐</span><b>Var svært</b><small>Prøv igen senere</small></button>
          <button type="button" class="confidence-btn blue" data-confidence="3"><span class="emoji">✓</span><b>Nogenlunde</b><small>Prøv igen om lidt</small></button>
          <button type="button" class="confidence-btn green" data-confidence="4"><span class="emoji">⭐</span><b>Meget godt</b><small>Næste kort</small></button>
        </div>` : `<div style="text-align:center"><button type="button" class="btn-primary" data-show-answer>👁 Vis svar</button></div>`}
      <div class="quiz-footer-nav"><button type="button" class="btn-outline" data-quiz-prev ${quiz.index === 0 ? 'disabled' : ''}>← Forrige</button><span style="font-size:11px;color:#8a8098">Kort ${quiz.index + 1} af ${quiz.questions.length}</span><button type="button" class="btn-primary" data-quiz-next ${!quiz.flipped ? 'disabled style="opacity:.5"' : ''}>Næste →</button></div>
      <div class="quiz-feedback" id="quizFeedback"></div>`;
    return;
  }

  if (isChoice) {
    const selected = quiz.selectedAnswer || '';
    host.innerHTML = `<div class="quiz-session-head"><div><h2>Test i gang</h2><p>${escapeHtml(setName)} (${quiz.questions.length} kort)</p></div><div class="quiz-session-actions">${sourceBadge}<button type="button" class="btn-outline" data-quiz-leave>Forlad test ✕</button></div></div>
      <div class="quiz-session-meta"><div class="quiz-progress-bar"><i style="width:${pct}%"></i><span class="quiz-progress-label">${quiz.index + 1} / ${quiz.questions.length}</span></div><div class="quiz-timer">⏱ ${String(Math.floor((quiz.elapsed || 765) / 60)).padStart(2, '0')}:${String((quiz.elapsed || 765) % 60).padStart(2, '0')}</div></div>
      <div class="fc-flip-card" style="cursor:default"><span class="card-label">Forside</span><h3>${escapeHtml(question.prompt)}</h3></div>
      <p style="font-size:12px;color:#6a6080;margin:12px 0">↪ Vælg dit svar</p>
      <div class="quiz-answer-grid">${question.options.map((option, i) => {
        const letter = String.fromCharCode(65 + i);
        const isSelected = selected === option;
        return `<button type="button" class="quiz-answer-btn${isSelected ? ' selected' : ''}" data-quiz-answer="${escapeHtml(option)}"><span class="letter">${letter}</span>${escapeHtml(option)}${isSelected ? '<span class="check">✓</span>' : ''}</button>`;
      }).join('')}</div>
      <div class="quiz-footer-nav"><button type="button" class="quiz-dont-know" data-quiz-unknown style="border:0;background:transparent">? Jeg ved det ikke</button><span style="font-size:11px;color:#8a8098">Kort ${quiz.index + 1} af ${quiz.questions.length}</span><button type="button" class="btn-primary" data-quiz-next-card ${!selected ? 'disabled style="opacity:.5"' : ''}>Næste kort →</button></div>
      <div class="quiz-feedback" id="quizFeedback"></div>`;
    return;
  }

  host.innerHTML = `<section class="quiz-stage">
    <div class="quiz-progress"><div style="width:${pct}%"></div></div>
    <header><span>${escapeHtml(question.subject)}</span><div class="quiz-session-actions">${sourceBadge}<b>${quiz.index + 1} / ${quiz.questions.length}</b></div></header>
    <div class="flashcard-quiz"><small>Forklar med egne ord</small><h3>${escapeHtml(question.prompt)}</h3>
      <textarea id="writtenExamAnswer" placeholder="Skriv din forklaring her..."></textarea><button type="button" class="btn-primary" data-submit-written>Svar</button>
      <button type="button" class="quiz-dont-know" data-quiz-unknown>Ved ikke</button>
      <div class="quiz-feedback" id="quizFeedback"></div>
    </div>
  </section>`;
}

async function generateExamPreparation() {
  if (!requireExamTrainingPremium()) return;
  if (!examData.plan?.length) {
    getExamQuizHost().innerHTML = `<div class="exam-plan-required"><span>▦</span><div><b>Du mangler en eksamensplan</b><p>Opret planen først, så testen kan bruge dit valgte pensum og dine noter.</p></div><button type="button" class="btn-primary" data-go-exam-plan>Gå til eksamensplan</button></div>`;
    return;
  }
  const ids = [...document.querySelectorAll('#examPrepSubjects input:checked, #examActivitySubjects input:checked, #examTrainingSubjects input:checked, #examFlashcardSubjects input:checked')].map(input => input.value);
  const subjects = examData.subjects.filter(subject => ids.includes(subject.id));
  const host = getExamQuizHost();
  if (!subjects.length) { host.innerHTML = '<p>Vælg mindst ét fag.</p>'; return; }
  const selectedMode = document.querySelector('input[name="examTrainingMode"]:checked')?.value || 'mixed';
  const mode = selectedExamPreset === 'weak' ? 'weak' : selectedMode;

  if (selectedMode === 'subject') {
    showAiLoading(host, 'Laver nye spørgsmål uden for dine noter…');
    const subjectText = subjects.map(sub => {
      const notePages = data.pages.filter(p => p.subjectId === sub.subjectId);
      const noteText = notePages.map(p => plainNoteText(p)).filter(Boolean).join('\n').slice(0, 3000);
      const litText = (sub.literature || []).map(l => l.text).join('\n').slice(0, 3000);
      return `### ${sub.name}\n**Notater:**\n${noteText || '(ingen noter)'}\n**Litteratur:**\n${litText || '(ingen litteratur)'}`;
    }).join('\n\n---\n\n');
    let questionsText;
    try {
      questionsText = await requestOpenAI({
        instructions: 'Du er eksamenstræner. Brug det givne materiale til at forstå fagets niveau og emner, men generér 8 nye, relevante spørgsmål, som ikke kan besvares ved blot at kopiere formuleringer fra noterne. Spørgsmålene må gerne gå ud over det konkrete pensum, men skal ligge naturligt i samme fagområde. Markér tydeligt i hvert hint, at spørgsmålet er ekstra træning uden for det valgte materiale. Variér mellem definition, forklaring, sammenligning, anvendelse og kritisk vurdering. Skriv på dansk. Format:\n## [Spørgsmål]\n**Hint:** [hvad et godt svar bør undersøge]',
        input: subjectText,
      });
    } catch {
      questionsText = subjects.flatMap(sub =>
        [...sub.topics.slice(0, 4), sub.name].map(t =>
          `## Forklar: ${t}\n**Hint:** Definition, faglige begreber, konkret eksempel og sammenhæng til pensum.`
        )
      ).join('\n\n');
    }
    const blocks = questionsText.split(/^##\s+/m).filter(b => b.trim().length > 5);
    const questions = blocks.map(block => {
      const lines = block.trim().split('\n').filter(Boolean);
      const prompt = lines[0].trim();
      const hint = lines.find(l => l.startsWith('**Hint:**'))?.replace('**Hint:**', '').trim() || '';
      return { id: uid(), type: 'written', subject: subjects[0]?.name || 'Faget', prompt, answer: '', explanation: hint };
    }).filter(q => q.prompt.length > 4).slice(0, 10);
    if (!questions.length) {
      host.innerHTML = '<div class="empty-list">Ingen spørgsmål genereret. Tilføj noter eller litteratur til faget og prøv igen.</div>';
      return;
    }
    activeExamQuiz = { questions, index: 0, correct: 0, scores: [], answered: new Set(), subjectIds: ids, mode: 'written' };
    renderExamQuiz();
    return;
  }

  const questions = buildExamQuestions(subjects, mode);
  activeExamQuiz = { questions, index: 0, correct: 0, scores: [], answered: new Set(), subjectIds: ids, mode, flipped: false, setName: subjects.map(s => s.name).join(' · '), selectedAnswer: '' };
  renderExamQuiz();
}

function generateExamPlan() {
  examData.start = $('#planStart').value;
  if (!examData.start) return alert('Vælg en startdato.');
  if (!examData.subjects.length) return alert('Tilføj mindst ét eksamensfag.');
  const planEl = $('#examPlan');
  if (planEl) showAiLoading(planEl, 'Laver eksamensplan…');
  const start = new Date(examData.start + 'T12:00:00');
  const plan = [];
  examData.subjects.forEach(sub => {
    const exam = new Date(sub.date + 'T12:00:00');
    if (exam <= start) return;
    const days = [];
    for (let d = new Date(start); d < exam; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) days.push(new Date(d));
    const topics = sub.topics.length ? sub.topics : [`Læs pensumoversigten for ${sub.name}`, 'Lav overblik over centrale begreber', 'Repetér og forklar uden noter'];
    const tasks = [...topics, `Samlet repetition: ${sub.name}`, `Prøveeksamen: ${sub.name}`];
    tasks.forEach((topic, i) => {
      const date = days[Math.min(days.length - 1, Math.floor(i * days.length / tasks.length))] || start;
      const key = dayKey(date);
      let day = plan.find(p => p.date === key);
      if (!day) { day = { date: key, tasks: [] }; plan.push(day); }
      day.tasks.push({ id: `${sub.id}-${i}`, subject: sub.name, subjectId: sub.id, topic, source: sub.source });
    });
  });
  if (!plan.length) return alert('Eksamensdatoen skal ligge efter startdatoen.');
  const validTaskIds = new Set(plan.flatMap(day => day.tasks).map(task => task.id));
  examData.checks = Object.fromEntries(Object.entries(examData.checks || {}).filter(([id]) => validTaskIds.has(id)));
  examData.plan = plan.sort((a, b) => a.date.localeCompare(b.date));
  saveExamData();
  renderExamPlan();
  renderExamSidebar();
}

function renderExamCalendar(plan) {
  const palette = ['#8ba7b8', '#c69a69', '#8eaa88', '#ae8aa5', '#b18c78', '#7e99b7', '#9c9470', '#789f9a'];
  const colors = new Map((examData.subjects || []).map((subject, index) => [subject.name, palette[index % palette.length]]));
  const tasksByDate = new Map(plan.map(day => [day.date, day.tasks || []]));
  if (!plan.length) return '<div class="empty-list">Tilføj fag og generér planen for at se kalenderen.</div>';
  const start = new Date(`${plan[0].date}T12:00:00`);
  const finalDates = (examData.subjects || []).map(subject => new Date(`${subject.date}T12:00:00`));
  const lastPlan = new Date(`${plan[plan.length - 1].date}T12:00:00`);
  const end = finalDates.reduce((latest, date) => date > latest ? date : latest, lastPlan);
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return `<div class="exam-calendar">${months.map(month => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const cells = Array.from({ length: leading }, () => '<div class="calendar-day empty"></div>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day, 12);
      const key = dayKey(date);
      const tasks = tasksByDate.get(key) || [];
      const exams = (examData.subjects || []).filter(subject => subject.date === key);
      cells.push(`<div class="calendar-day ${tasks.length ? 'has-tasks' : ''} ${exams.length ? 'exam-date' : ''}">
        <b>${day}</b>
        ${tasks.slice(0, 4).map(task => `<label style="--subject-color:${colors.get(task.subject) || '#8ba7b8'}" title="${escapeHtml(task.topic)}"><input type="checkbox" data-exam-check="${task.id}" ${examData.checks[task.id] ? 'checked' : ''}><span>${escapeHtml(task.subject)}</span></label>`).join('')}
        ${tasks.length > 4 ? `<small>+ ${tasks.length - 4} opgaver</small>` : ''}
        ${exams.map(subject => `<em style="--subject-color:${colors.get(subject.name) || '#8ba7b8'}">Eksamen · ${escapeHtml(subject.name)}</em>`).join('')}
      </div>`);
    }
    return `<section class="exam-calendar-month"><h3>${month.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })}</h3><div class="calendar-weekdays">${['Man','Tir','Ons','Tor','Fre','Lør','Søn'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div></section>`;
  }).join('')}</div>`;
}

function renderExamPlan() {
  const plan = examData.plan || [];
  examData.view ||= 'checklist';
  document.querySelectorAll('[data-exam-plan-view]').forEach(button => button.classList.toggle('active', button.dataset.examPlanView === examData.view));
  const subjectPlans = (examData.subjects || []).map(subject => ({
    subject,
    days: plan.map(day => ({ ...day, tasks: day.tasks.filter(task => task.subject === subject.name) })).filter(day => day.tasks.length),
  })).filter(group => group.days.length);
  const multiSubject = subjectPlans.length > 1;
  const checklistHtml = subjectPlans.length
    ? (multiSubject && examData.view === 'checklist'
      ? `<div class="exam-activity-panel"><h4>Vælg et fag</h4><p class="hint">Din plan er opdelt pr. fag, så du undgår at blande fx kemi og matematik. Klik på et fag-kort ovenfor for at se og afkrydse opgaver for netop det fag.</p></div>`
      : subjectPlans.map((group, groupIndex) => {
      const remaining = Math.ceil((new Date(`${group.subject.date}T12:00:00`) - new Date()) / 86400000);
      const urgent = remaining >= 0 && remaining <= 10;
      const tasks = group.days.flatMap(day => day.tasks);
      const done = tasks.filter(task => examData.checks[task.id]).length;
      return `<section class="subject-exam-plan ${urgent ? 'urgent' : ''}">
        <header><div><span>${urgent ? '!' : '▦'}</span><div><h3>${escapeHtml(group.subject.name)}</h3><p>Eksamen ${formatDate(`${group.subject.date}T12:00:00`)}${urgent ? ` · ${remaining === 0 ? 'i dag' : `${remaining} dage tilbage`}` : ''}</p></div></div><b>${done}/${tasks.length}</b></header>
        ${group.days.map((day, index) => `<details class="plan-day ${groupIndex === 0 && index === 0 ? 'today-plan' : ''}" ${index === 0 ? 'open' : ''}><summary><span><small>${new Date(`${day.date}T12:00:00`).toLocaleDateString('da-DK',{weekday:'long'})}</small>${formatDate(`${day.date}T12:00:00`)}</span><span>${day.tasks.filter(task => examData.checks[task.id]).length}/${day.tasks.length}</span></summary><div class="plan-body">${day.tasks.map(task => renderPlanTaskRow(task)).join('')}</div></details>`).join('')}
      </section>`;
    }).join(''))
    : '<div class="empty-list">Tilføj fag og emner.</div>';
  $('#examPlan').innerHTML = examData.view === 'calendar' ? renderExamCalendar(plan) : checklistHtml;
  const tasks = plan.flatMap(d => d.tasks);
  const done = tasks.filter(t => examData.checks[t.id]).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $('#examProgressBar').style.width = pct + '%';
  $('#examProgressText').textContent = tasks.length ? `${done} af ${tasks.length} · ${pct}%` : 'Ingen plan endnu';
  renderExamSubjectCards();
  if (examData.plan?.length && examData.subjects?.length) renderExamPlanDashboard();
}

function renderProfileStatus() {
  const profile = getSession();
  const el = $('#profileStatus');
  if (!el) return;
  if (profile) {
    const premiumLabel = premiumDisplayLabel(getActivePremiumSubscription(profile));
    el.innerHTML = profile.guest
      ? '<strong>Gæst</strong>'
      : `<div class="profile-status-card"><strong class="profile-status-name">${escapeHtml(profile.name)}</strong><span class="profile-status-meta">${escapeHtml(studyAreaLabel(appSettings.studyField))} · gemt lokalt</span><div class="profile-status-tags">${premiumLabel ? `<span class="profile-premium">${escapeHtml(premiumLabel)}</span>` : ''}<span class="profile-points">${rewardData.points} studieklip · ${rewardDiscount()}% rabat</span></div></div>`;
    updateSyncStatus();
    const logout = $('#logoutButton');
    if (logout) logout.textContent = profile.guest ? 'Afslut gæst' : U('logout');
    const initials = profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'NI';
    const avatar = $('.topbar-avatar');
    if (avatar) {
      avatar.classList.toggle('has-image', Boolean(profile.avatar));
      avatar.style.backgroundImage = profile.avatar ? `url("${profile.avatar}")` : '';
      avatar.textContent = profile.avatar ? '' : initials;
      avatar.title = profile.guest ? 'Opret bruger for at gemme profilbillede' : 'Skift profilbillede';
    }
    const profileName = $('#topbarProfileName');
    if (profileName) profileName.textContent = profile.name;
  } else {
    el.innerHTML = 'Ikke logget ind';
    const profileName = $('#topbarProfileName');
    if (profileName) profileName.textContent = '';
  }
}

function resizeProfileImage(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('Profilbilledet må højst fylde 12 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Billedet kunne ikke læses.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Billedformatet understøttes ikke.'));
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        const crop = Math.min(image.width, image.height);
        context.drawImage(image, (image.width - crop) / 2, (image.height - crop) / 2, crop, crop, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', .86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function openSubjectDialog(semesterId) {
  const activeNotebook = semesterId
    ? data.semesters.find(sem => sem.id === semesterId)
    : data.semesters[Math.min(data.ui.notebookIndex || 0, data.semesters.length - 1)];
  if (!activeNotebook) { openNotebookDialog(); return; }
  const used = data.subjects.filter(subject => subject.semesterId === activeNotebook.id).map(subject => subject.color);
  selectedColor = colors.find(color => !used.includes(color)) || colors[data.subjects.length % colors.length];
  $('#subjectName').value = '';
  $('#subjectDialogTitle').textContent = U('startSubject');
  $('#subjectDialogHint').textContent = U('subjectHint');
  $('#subjectNameLabel').textContent = U('subject');
  $('#subjectColorLabel').textContent = U('subjectColor');
  $('#subjectCancel').textContent = U('cancel');
  $('#subjectSubmit').textContent = U('newSubject');
  $('#subjectName').placeholder = uiLang() === 'en' ? 'E.g. Mathematics' : 'Fx Matematik';
  $('#subjectForm').dataset.semesterId = activeNotebook.id;
  $('#subjectColors').innerHTML = colors.map(c => `<button type="button" class="swatch ${c === selectedColor ? 'selected' : ''}" data-color="${c}" style="background:${c}" aria-label="Vælg farve"></button>`).join('')
    + `<label class="custom-swatch" title="Vælg din egen farve"><input id="customSubjectColor" type="color" value="${selectedColor}"><span>+</span></label>`;
  $('#subjectDialog').showModal();
}

function updateNotebookLevelOptions(selectedYear) {
  const education = $('#notebookEducation')?.value || 'bachelor';
  const field = $('#notebookLevelField');
  const select = $('#notebookLevel');
  if (!field || !select) return;
  field.classList.remove('hidden');
  const max = education === 'professional' ? 7 : education === 'master' ? 4 : 6;
  const noun = U('semester');
  select.innerHTML = Array.from({ length: max }, (_, index) => {
    const year = index + 1;
    return `<option value="${year}" ${Number(selectedYear) === year ? 'selected' : ''}>${noun} ${year}</option>`;
  }).join('');
}

function openNotebookDialog() {
  const palette = ['#34312e', '#718da4', '#7b8f7a', '#927b91', '#9b765f', '#6d7f88', '#8e7866'];
  selectedNotebookColor = palette[data.semesters.length % palette.length];
  $('#notebookForm').reset();
  $('#notebookEducation').innerHTML = `
    <option value="bachelor">${escapeHtml(U('bachelor'))}</option>
    <option value="professional">${escapeHtml(U('professionalBachelor'))}</option>
    <option value="master">${escapeHtml(U('master'))}</option>
    <option value="phd">${escapeHtml(U('phd'))}</option>`;
  $('#notebookEducation').value = 'bachelor';
  $('#notebookName').placeholder = uiLang() === 'en' ? 'E.g. Computer Science' : 'Fx Datalogi';
  updateNotebookLevelOptions();
  $('#notebookColors').innerHTML = palette.map(color => `<button type="button" class="swatch ${color === selectedNotebookColor ? 'selected' : ''}" data-notebook-color="${color}" style="background:${color}" aria-label="Vælg notesbogsfarve"></button>`).join('');
  $('#notebookDialog').showModal();
}

function renderSemesterPickButtons() {
  const lang = uiLang();
  const mk = (program, years) => years.map(y => {
    const taken = data.semesters.some(s => s.program === program && s.year === y);
    const label = `${program === 'master' ? U('master') : U('bachelor')}: ${formatSemesterLabel({ program, year: y }, lang)}`;
    return `<button type="button" class="semester-pick${taken ? ' taken' : ''}" data-program="${program}" data-year="${y}" ${taken ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
  }).join('');
  const bEl = $('#bachelorPicks'), mEl = $('#masterPicks');
  if (bEl) bEl.innerHTML = mk('bachelor', [1, 2, 3, 4, 5, 6]);
  if (mEl) mEl.innerHTML = mk('master', [1, 2]);
}

function addSemester(program, year) {
  if (data.semesters.some(s => s.program === program && s.year === year)) return;
  const id = uid();
  data.semesters.push({ id, program, year, sort: data.semesters.length });
  data.ui.semesterOpen[id] = true;
  persist();
  $('#semesterDialog')?.close();
  render();
}

function openSemesterDialog() {
  applyUiLanguage();
  renderSemesterPickButtons();
  $('#semesterDialog')?.showModal();
}

function guideText(page) {
  const goal = page.goal ? `Mål: ${page.goal}. ` : '';
  const tips = {
    mathematics: 'Start med definitioner, skriv formler tydeligt, og afslut med et eksempel.',
    physics: 'Notér enheder, antagelser og sammenhæng mellem teori og forsøg.',
    tech: 'Beskriv input/output, algoritme og test med kodeeksempler.',
    general: 'Brug overskrifter, hovedpointer og en kort opsummering til sidst.',
    chemistry: 'Skriv reaktioner, koncentrationer og sikkerhedsforhold.',
    engineering: 'Tegn kredsløb, angiv komponentværdier og beregn resultater.',
    humanities: 'Notér kilder, kontekst, argumenter og tekststeder, der dokumenterer din fortolkning.',
    economics: 'Skeln mellem antagelser, data, modeller, beregninger og økonomisk fortolkning.',
    languages: 'Saml ordforråd, grammatiske mønstre, tekststeder og oversættelsesvalg.',
    social: 'Adskil teori, metode, empiri, analyse og metodiske begrænsninger.',
    psychology: 'Knyt teori til hjerne, kognition og adfærd – brug modeller og metode tydeligt.',
    health: 'Notér observationer, evidens, faglige vurderinger og klinisk relevans tydeligt.',
    law: 'Strukturér problem, retskilder, fortolkning, anvendelse på faktum og konklusion.',
    music: 'Saml temaer, harmonik, rytme, form, klang og lyttende observationer.',
    statistics: 'Angiv data, test, konfidensintervaller og fortolkning — skeln mellem signifikans og relevans.',
    philosophy: 'Formuler tesen tydeligt, præmisser, indvendinger og din konklusion med kildehenvisning.',
    other: 'Brug den struktur, der passer til dit emne.',
  };
  return goal + (tips[page.docType] || tips.general);
}

function pageStarterHtml(docType, title, goal, expectations) {
  const cfg = docTypes[docType] || docTypes.general;
  let body = '';
  if (goal) body += `<p><b>Mål:</b> ${escapeHtml(goal)}</p>`;
  if (expectations >= 4) {
    const blocks = {
      mathematics: '<div class="stem-block"><h4>Problem</h4><p class="math-line"></p><p><b>Metode:</b></p><p><b>Løsning:</b></p></div>',
      physics: '<div class="stem-block"><h4>Fysik-notat</h4><p><b>Teori:</b></p><p><b>Enheder:</b></p><p><b>Resultat:</b></p></div>',
      tech: '<div class="stem-block"><h4>Algoritme</h4><p><b>Input:</b></p><p><b>Output:</b></p><ol><li></li></ol></div>',
      general: '<h2>' + escapeHtml(title) + '</h2><p><b>Hovedpointer:</b></p><ul><li></li></ul><p><b>Opsummering:</b></p>',
      chemistry: '<div class="stem-block"><h4>Kemi-notat</h4><p><b>Reaktion:</b></p><p><b>Beregning:</b></p></div>',
      engineering: '<div class="stem-block"><h4>Kredsløb / beregning</h4><p>V = I · R</p><p><b>Komponenter:</b></p></div>',
      civilEngineering: '<div class="stem-block field-civilEngineering"><h4>Konstruktion</h4><p><b>Last og randbetingelser:</b></p><p><b>Materialer:</b></p><p><b>Beregning og sikkerhed:</b></p></div>',
      electricalEngineering: '<div class="stem-block field-electricalEngineering"><h4>Elektrisk system</h4><p><b>Kredsløb og signal:</b></p><p><b>Komponentværdier:</b></p><p><b>Måling og resultat:</b></p></div>',
      mechanicalEngineering: '<div class="stem-block field-mechanicalEngineering"><h4>Mekanisk system</h4><p><b>Kræfter og moment:</b></p><p><b>Materiale og geometri:</b></p><p><b>Beregning og validering:</b></p></div>',
      softwareEngineering: '<div class="stem-block field-softwareEngineering"><h4>Softwaredesign</h4><p><b>Krav og use case:</b></p><p><b>Arkitektur og data:</b></p><p><b>Test og resultat:</b></p></div>',
      biotechnology: '<div class="stem-block field-biotechnology"><h4>Bioteknologisk forsøg</h4><p><b>Hypotese:</b></p><p><b>Metode og variable:</b></p><p><b>Resultater og fejlkilder:</b></p></div>',
      biology: '<div class="stem-block field-biology"><h4>Biologisk system</h4><p><b>Struktur:</b></p><p><b>Funktion og mekanisme:</b></p><p><b>Evidens og eksempel:</b></p></div>',
      medicine: '<div class="stem-block field-medicine"><h4>Klinisk notat</h4><p><b>Anamnese og fund:</b></p><p><b>Vurdering og differentialdiagnoser:</b></p><p><b>Plan og evidens:</b></p></div>',
      history: '<div class="stem-block field-history"><h4>Historisk analyse</h4><p><b>Periode og kontekst:</b></p><p><b>Kilder og aktører:</b></p><p><b>Årsag, virkning og vurdering:</b></p></div>',
      culturalStudies: '<div class="stem-block field-culturalStudies"><h4>Kulturanalyse</h4><p><b>Materiale og kontekst:</b></p><p><b>Begreber, positioner og magt:</b></p><p><b>Fortolkning og dokumentation:</b></p></div>',
      humanities: '<h2>Problemstilling</h2><p></p><h3>Kilder og kontekst</h3><p></p><h3>Analyse og fortolkning</h3><p></p>',
      economics: '<h2>Problem og antagelser</h2><p></p><h3>Model eller data</h3><p></p><h3>Analyse og konklusion</h3><p></p>',
      languages: '<h2>Tekst og kontekst</h2><p></p><h3>Ordforråd og grammatik</h3><p></p><h3>Analyse eller oversættelse</h3><p></p>',
      social: '<h2>Problemstilling</h2><p></p><h3>Teori og metode</h3><p></p><h3>Empiri og analyse</h3><p></p>',
      psychology: '<div class="stem-block field-psychology"><h4>Psykologisk analyse</h4><p><b>Fænomen og teori:</b></p><p><b>Metode og design:</b></p><p><b>Resultat og fortolkning:</b></p><p><b>Hjerne/kognition:</b> Brug hjerne- eller hukommelsesmodellen til at forklare mekanismen.</p></div>',
      health: '<h2>Fagligt fokus</h2><p></p><h3>Observationer og evidens</h3><p></p><h3>Vurdering</h3><p></p>',
      law: '<h2>Juridisk problem</h2><p></p><h3>Retskilder og regel</h3><p></p><h3>Anvendelse og konklusion</h3><p></p>',
      music: '<h2>Værk eller emne</h2><p></p><h3>Tema, harmoni og rytme</h3><p></p><h3>Form, klang og fortolkning</h3><p></p>',
      statistics: '<div class="stem-block"><h4>Statistisk analyse</h4><p><b>Data og variabler:</b></p><p><b>Test og resultater:</b></p><p><b>Fortolkning:</b></p></div>',
      philosophy: '<h2>Tese og problemstilling</h2><p></p><h3>Præmisser og argumenter</h3><p></p><h3>Indvendinger og konklusion</h3><p></p>',
    };
    body += blocks[docType] || blocks.general;
  } else {
    body += `<p></p>`;
  }
  return body + '<p><br></p>';
}

function openPageDialog(subjectId) {
  if (subjectId) {
    data.currentSubject = subjectId;
    persist();
  }
  if (!data.currentSubject) {
    data.ui.view = 'home';
    persist();
    renderWorkspace();
    return;
  }
  $('#pageSetupForm')?.reset();
  const preferredType = normalizeDocTypePickerValue(studyFieldDocType(appSettings.studyField));
  renderDocTypePicker(preferredType);
  syncPageOtherTypeField(preferredType);
  const preferredRadio = document.querySelector(`input[name="docType"][value="${preferredType}"]`);
  if (preferredRadio) preferredRadio.checked = true;
  $('#pageAutoCorrect').value = appSettings.autoCorrect === false ? 'no' : 'yes';
  const subject = activeSubject();
  if ($('#pageSetupTitle')) $('#pageSetupTitle').placeholder = `Ny forelæsning eller lektion i ${subject?.name || 'faget'}`;
  $('#pageSetupDialog')?.showModal();
}

function createPageFromSetup(e) {
  e.preventDefault();
  if (!data.currentSubject) return;
  if (isGuest() && data.pages.length >= 1) {
    $('#pageSetupDialog')?.close();
    requireLogin('Gæstedemoen indeholder ét prøvepapir. Log ind eller opret en bruger for at lave flere noter.');
    return;
  }
  const title = $('#pageSetupTitle').value.trim() || 'Nyt dokument';
  const docType = normalizeDocTypePickerValue([...document.querySelectorAll('input[name="docType"]')].find(r => r.checked)?.value || 'other');
  const expectations = 1;
  const goal = '';
  const factCheck = false;
  const autoCorrect = $('#pageAutoCorrect').value === 'yes';
  const classLevel = 'universitet';
  const customType = docType === 'other' ? ($('#pageOtherType')?.value.trim() || '') : '';
  if (docType === 'other' && !customType) {
    $('#pageOtherType')?.focus();
    return alert('Skriv navnet på dit fag.');
  }
  const id = uid();
  data.pages.push({
    id, subjectId: data.currentSubject, title, deadline: '', created: new Date().toISOString(),
    language: appSettings.defaultLanguage, html: pageStarterHtml(docType, title, goal, expectations),
    comments: [], updated: new Date().toISOString(),
    docType, customType, expectations, goal, factCheck, autoCorrect, proofreading: true, classLevel,
    pageView: 'continuous', paperCorners: 'round', paperZoom: 100, paperPattern: 'dots',
    sheets: [pageStarterHtml(docType, title, goal, expectations)], sheetTitles: [''], currentSheet: 0,
    toolPacks: (() => {
      const base = resolvePageToolPacks({ docType });
      const pack = studyFieldPack(appSettings.studyField);
      if (pack && pack !== 'general' && toolPacks[pack]) {
        return [...new Set([...base, pack])];
      }
      return base;
    })(),
  });
  data.currentPage = id;
  persist();
  $('#pageSetupDialog').close();
  render();
  setTimeout(() => { $('#pageTitle')?.focus(); $('#pageTitle')?.select(); }, 80);
}

function addPage() { openPageDialog(); }

function selectSubject(id) {
  closeUniversityToolDialog();
  data.currentSubject = id;
  data.ui.view = 'home';
  const pages = data.pages.filter(p => p.subjectId === id).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  data.currentPage = pages[0]?.id || null;
  persist();
  render();
}

function selectPage(id) {
  closeUniversityToolDialog();
  const p = data.pages.find(x => x.id === id);
  if (p) data.currentSubject = p.subjectId;
  data.ui.view = 'home';
  data.currentPage = id;
  persist();
  renderPages();
  renderSubjects();
  renderWorkspace();
  renderWidgets();
}

function bindEvents() {
  initLanding();
  initWorkspaceEvents();
  document.addEventListener('input', e => {
    if (!isGuest() || !guestEditReady || e.target.closest('#welcomeDialog') || e.target.id === 'globalSearch') return;
    if (e.target.closest('#app') || e.target.closest('dialog')) showGuestSaveNotice();
  });
  document.addEventListener('change', e => {
    if (!isGuest() || !guestEditReady || e.target.closest('#welcomeDialog') || e.target.id === 'globalSearch') return;
    if (e.target.closest('#app') || e.target.closest('dialog')) showGuestSaveNotice();
  });
  document.addEventListener('click', e => {
    if (!isGuest() || !guestEditReady) return;
    const saveAction = e.target.closest(
      '#newGroup, [data-add-brain-card], [data-add-project-person], #generatePlan, #generateExamPrep, dialog form button[type="submit"]'
    );
    if (saveAction && !saveAction.closest('#welcomeDialog')) showGuestSaveNotice();
  });

  $('#examSidebarCard')?.addEventListener('click', e => {
    if (e.target.closest('[data-action="open-exam"]')) openExamDialog();
  });

  document.addEventListener('mouseup', e => {
    if (e.target.closest('#selectionHelper')) return;
    setTimeout(showSelectionHelper, 0);
  });
  document.addEventListener('mousedown', e => {
    if (!e.target.closest('#selectionHelper') && !e.target.closest('#editor')) hideSelectionHelper();
  });
  document.addEventListener('click', e => {
    if (e.target.closest('#translateNoteBtn')) {
      const page = activePage();
      if (!page) return alert('Ingen aktiv note at oversætte.');
      const text = plainNoteText(page);
      if (!text?.trim()) return alert('Noterne er tomme – skriv noget først.');
      openTranslateDialog(text);
      return;
    }
  });
  document.addEventListener('click', e => {
    const playBtn = e.target.closest('[data-play-music-notes]');
    if (playBtn) {
      e.preventDefault();
      const section = playBtn.closest('.music-staff-insert');
      const tempo = Number(section?.dataset.musicTempo) || 80;
      const pitches = [...(section?.querySelectorAll('.music-staff-notes') || [])].map(el => el.textContent.split('–').map(s => s.trim()).flat())[0]
        || (section?.querySelector('.music-staff-notes')?.textContent || '').split('–').map(s => s.trim()).filter(Boolean);
      const noteTexts = section?.querySelector('.music-staff-notes')?.textContent || '';
      const noteList = noteTexts.split('–').map(s => s.trim()).filter(s => s && s !== 'Ingen noder');
      if (!noteList.length) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return alert('Din browser understøtter ikke lydafspilning.');
      const ctx = new AudioCtx();
      const beatMs = 60000 / Math.max(40, tempo);
      let when = ctx.currentTime + 0.05;
      noteList.forEach(pitch => {
        const freq = MUSIC_NOTE_FREQ[pitch];
        if (!freq) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const dur = beatMs / 1000;
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(0.2, when + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(when);
        osc.stop(when + dur + 0.02);
        when += dur * 0.92;
      });
      return;
    }
    const remove = e.target.closest('.sticky-delete');
    if (!remove) return;
    remove.closest('[data-sticky]')?.remove();
    $('#editor')?.dispatchEvent(new Event('input'));
  });
  document.addEventListener('pointerdown', e => {
    const sticky = e.target.closest('[data-sticky]');
    if (!sticky || e.target.closest('.sticky-content, .sticky-delete')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = Number.parseFloat(sticky.dataset.x || '0');
    const initialY = Number.parseFloat(sticky.dataset.y || '0');
    sticky.classList.add('dragging');
    sticky.setPointerCapture?.(e.pointerId);
    const move = event => {
      const x = initialX + event.clientX - startX;
      const y = initialY + event.clientY - startY;
      sticky.dataset.x = x;
      sticky.dataset.y = y;
      sticky.style.setProperty('--sticky-x', `${x}px`);
      sticky.style.setProperty('--sticky-y', `${y}px`);
    };
    const stop = () => {
      sticky.classList.remove('dragging');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      $('#editor')?.dispatchEvent(new Event('input'));
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop, { once: true });
  });
  $('#selectionHelper')?.addEventListener('mousedown', e => e.preventDefault());
  $('#selectionHelper')?.addEventListener('click', e => {
    const button = e.target.closest('[data-selection-action]');
    if (button) runSelectionAction(button.dataset.selectionAction);
  });

  $('#quoteResult')?.addEventListener('click', e => {
    if (e.target.closest('#insertPdfMaterial') && pdfGeneratedHtml) {
      const html = pdfGeneratedHtml;
      const material = `${html}<p><br></p>`;
      if (!insertPdfHtmlIntoActivePaper(material)) return alert('Opret eller åbn en note, før materialet indsættes.');
      pdfGeneratedHtml = '';
      $('#pdfDialog').close();
      return;
    }
    if (e.target.closest('#insertQuote') && lastPdfQuote) {
      const { quote, pageNumber, source } = lastPdfQuote;
      const qHtml = `<blockquote class="citation">"${escapeHtml(quote.trim())}"<cite>${escapeHtml(source)}, s. ${pageNumber}</cite></blockquote><p><br></p>`;
      lastPdfQuote = null;
      $('#pdfDialog').close();
      setTimeout(() => insertHtml(qHtml), 50);
    }
  });

  $('#notebookEducation')?.addEventListener('change', () => updateNotebookLevelOptions());
  $('#addPage')?.addEventListener('click', openPageDialog);
  $('#addSemester')?.addEventListener('click', openSemesterDialog);

  document.querySelector('.sidebar-nav')?.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    nav.classList.add('active');
    data.ui.view = nav.dataset.nav === 'notebook' ? 'notebook' : 'home';
    persist();
    renderWorkspace();
  });

  $('#semesters')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-toggle-semester]');
    if (!btn) return;
    const id = btn.dataset.toggleSemester;
    const isOpen = data.ui.semesterOpen[id] !== false;
    data.ui.semesterOpen[id] = !isOpen;
    persist();
    renderSemesters();
    renderSubjects();
  });

  $('#docTypeGrid')?.addEventListener('change', e => {
    if (e.target.name !== 'docType') return;
    syncPageOtherTypeField(e.target.value);
    $('#docTypeGrid')?.querySelectorAll('.doc-type-sticker').forEach(tile => {
      tile.classList.toggle('active', tile.querySelector('input')?.value === e.target.value);
    });
    const summary = $('#docTypeGrid')?.querySelector('[data-doc-type-summary]');
    if (summary) summary.textContent = docTypeDisplayLabel(e.target.value);
    $('#docTypeGrid')?.querySelectorAll('.doc-category').forEach(section => {
      const hasSelection = [...section.querySelectorAll('input[name="docType"]')].some(input => input.value === e.target.value);
      section.classList.toggle('has-selection', hasSelection);
    });
  });
  $('#showMoreDocTypes')?.addEventListener('click', e => {
    const expanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
    e.currentTarget.setAttribute('aria-expanded', String(!expanded));
    e.currentTarget.textContent = expanded ? 'Flere fag' : 'Vis færre fag';
    document.querySelectorAll('.extra-doc-type').forEach(card => card.classList.toggle('hidden', expanded));
  });

  $('#pageSetupForm')?.addEventListener('submit', createPageFromSetup);
  $('#toolPacksForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const page = activePage();
    if (!page) return;
    const selected = [...document.querySelectorAll('input[name="toolPack"]:checked')].map(input => input.value).filter(id => toolPacks[id]);
    const defaults = resolvePageToolPacks({ docType: page.docType });
    page.toolPacks = [...new Set([...defaults, ...selected])];
    persist();
    $('#toolPacksDialog').close();
    renderWorkspace();
  });

  $('#semesterForm')?.addEventListener('submit', e => e.preventDefault());
  $('#semesterDialog')?.addEventListener('click', e => {
    const btn = e.target.closest('.semester-pick:not(:disabled)');
    if (!btn) return;
    addSemester(btn.dataset.program, Number(btn.dataset.year));
  });

  $('#toggleProjects')?.addEventListener('click', () => {
    data.ui.projectsOpen = !data.ui.projectsOpen;
    persist(); renderProjects();
  });
  $('#openProjectsGroups')?.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
  });
  $('#toggleResources')?.addEventListener('click', () => {
    data.ui.resourcesOpen = !data.ui.resourcesOpen;
    persist(); renderResources();
  });
  $('#capabilityGroups')?.addEventListener('click', e => {
    const toggle = e.target.closest('[data-toggle-capability]');
    if (toggle) {
      const group = toggle.closest('.capability-group');
      group.classList.toggle('open');
      group.querySelector('.cap-toggle').textContent = group.classList.contains('open') ? 'minus ' : '+';
      return;
    }
    const item = e.target.closest('[data-capability-action]');
    if (item) handleCapabilityAction(item.dataset.capabilityAction, item.textContent.trim());
  });
  $('#addProject')?.addEventListener('click', () => {
    if (requirePremium()) openNewProjectDialog();
  });
  $('#projectsList')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-project]');
    if (!btn) return;
    if (!requirePremium()) return;
    renderProjectWorkspace(btn.dataset.project);
    $('#projectDialog').showModal();
  });
  $('#projectDialog')?.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'newProjectForm') {
      const initialFile = $('#newProjectInitialFile')?.files?.[0];
      const project = {
        id: uid(), name: $('#newProjectName').value.trim(), mode: $('#newProjectMode').value,
        members: [], notes: '', cards: [], files: initialFile ? [{ name: initialFile.name, size: initialFile.size }] : [],
        workspaces: { milestones: [], kanban: [], research: [], risks: [], team: [], report: [] },
      };
      data.projects.push(project);
      data.ui.projectsOpen = true;
      persist(); renderProjects(); renderProjectWorkspace(project.id);
      return;
    }
    const tool = e.target.dataset.projectForm;
    const project = data.projects.find(item => item.id === activeProjectId);
    if (!tool || !project) return;
    const record = { id: uid(), ...formRecord(e.target) };
    if (tool === 'brainstorm') project.cards.push(record);
    else project.workspaces[tool].push(tool === 'kanban' ? { status: 'To do', ...record } : record);
    persist();
    renderProjectWorkspace(project.id, tool);
  });
  $('#projectDialog')?.addEventListener('click', e => {
    const hub = e.target.closest('[data-project-hub]');
    if (hub) {
      const action = hub.dataset.projectHub;
      const project = data.projects.find(item => item.id === activeProjectId) || data.projects[0];
      if (!project) {
        openNewProjectDialog();
        setTimeout(() => { if ($('#newProjectMode')) $('#newProjectMode').value = action === 'brainstorm' ? 'brainstorm' : 'folder'; }, 0);
        return;
      }
      renderProjectWorkspace(project.id, action);
      return;
    }
    const toolButton = e.target.closest('[data-open-project-tool]');
    if (toolButton && activeProjectId) {
      renderProjectWorkspace(activeProjectId, toolButton.dataset.openProjectTool);
      return;
    }
    if (e.target.closest('[data-project-back]')) {
      renderProjectWorkspace(activeProjectId);
      return;
    }
    if (e.target.closest('[data-collect-project-ideas]')) {
      const project = data.projects.find(item => item.id === activeProjectId);
      project.summary = groupedIdeaSummary(project.cards);
      persist(); renderProjectWorkspace(project.id, 'brainstorm');
      return;
    }
    const deleteButton = e.target.closest('[data-project-delete]');
    if (deleteButton) {
      const project = data.projects.find(item => item.id === activeProjectId);
      const tool = deleteButton.dataset.projectDelete;
      const records = tool === 'brainstorm' ? project.cards : tool === 'files' ? project.files : project.workspaces[tool];
      removeWorkspaceRecord(records, deleteButton.dataset.recordId);
      persist(); renderProjectWorkspace(project.id, activeProjectTool);
      return;
    }
    if (e.target.closest('[data-new-project-brainstorm]')) {
      $('#newProjectMode').value = 'brainstorm';
      $('#newProjectName').focus();
      return;
    }
    const addCard = e.target.closest('[data-add-brain-card]');
    if (addCard) {
      const project = data.projects.find(item => item.id === addCard.dataset.addBrainCard);
      project.cards.push({ author: getSession()?.name || 'Idé', text: '' }); persist(); renderProjectWorkspace(project.id); return;
    }
    const addPerson = e.target.closest('[data-add-project-person]');
    if (addPerson) {
      const email = prompt('E-mail eller navn på deltager:');
      const project = data.projects.find(item => item.id === addPerson.dataset.addProjectPerson);
      if (email?.trim()) { project.members.push(email.trim()); persist(); renderProjectWorkspace(project.id); }
      return;
    }
  });
  $('#projectDialog')?.addEventListener('input', e => {
    if (!e.target.dataset.projectLive || !activeProjectId) return;
    const project = data.projects.find(item => item.id === activeProjectId);
    project[e.target.dataset.projectLive] = e.target.value;
    persist();
  });
  $('#projectDialog')?.addEventListener('change', e => {
    const project = data.projects.find(item => item.id === activeProjectId);
    if (!project) return;
    if (e.target.dataset.projectKanbanStatus) {
      const card = project.workspaces.kanban.find(item => item.id === e.target.dataset.projectKanbanStatus);
      if (card) card.status = e.target.value;
      persist(); renderProjectWorkspace(project.id, 'kanban');
      return;
    }
    if (e.target.matches('[data-project-workspace-file]')) {
      project.files.push(...[...(e.target.files || [])].map(file => ({ name: file.name, size: file.size, type: file.type })));
      persist(); renderProjectWorkspace(project.id, 'upload');
      return;
    }
    if (e.target.dataset.projectFile) {
      const file = e.target.files[0];
      if (file) { project.files.push({ name: file.name, size: file.size, type: file.type }); persist(); renderProjectWorkspace(project.id); }
    }
  });
  $('#resourcesList')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-resource]');
    if (!btn) return;
    if (!$('#editor')) return;
    captureEditorRange();
    const names = { 'res-formulas': 'Formler', 'res-code': 'Kode', 'res-sheets': 'Datablade', 'res-models': 'Interaktive modeller' };
    const label = names[btn.dataset.resource] || 'Ressource';
    if (btn.dataset.resource === 'res-formulas') openFormulaLibrary();
    else if (btn.dataset.resource === 'res-code') openCodeDialog('Arduino');
    else if (btn.dataset.resource === 'res-models') openModelDialog();
    else insertHtml(`<div class="stem-block"><h4>${label}</h4><p>Tilføj link eller noter her.</p></div><p><br></p>`);
  });

  $('#modelTemplates')?.addEventListener('click', e => {
    const category = e.target.closest('[data-model-category]');
    if (category) {
      const id = category.dataset.modelCategory;
      modelCategoryOpen[id] = !(modelCategoryOpen[id] ?? category.closest('.model-category').classList.contains('open'));
      renderModelDialog();
      return;
    }
    const btn = e.target.closest('[data-model-template]');
    if (!btn) return;
    modelState.template = btn.dataset.modelTemplate;
    modelState.colors = {};
    modelState.pins = [];
    modelState.selectedPart = '';
    modelState.pending = null;
    if (modelState.template === 'custom') {
      const customName = prompt('Hvad skal din egen model hedde?', 'Min model');
      if (customName?.trim()) modelTemplates.custom.name = customName.trim();
    }
    $('#modelNoteText').value = '';
    $('#modelSelectedPart').textContent = 'Ingen del valgt';
    renderModelDialog();
  });
  $('#modelPalette')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-model-color]');
    if (!btn) return;
    modelState.color = btn.dataset.modelColor;
    $('#modelPalette').querySelectorAll('.model-color').forEach(el => el.classList.toggle('active', el === btn));
  });
  document.querySelector('.model-mode-group')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-model-mode]');
    if (!btn) return;
    modelState.mode = btn.dataset.modelMode;
    document.querySelectorAll('[data-model-mode]').forEach(el => el.classList.toggle('active', el === btn));
    $('#modelStageTip').textContent = modelState.mode === 'paint'
      ? 'Klik på en modeldel for at farvelægge den.'
      : 'Klik på den del, som din note skal forbindes til.';
  });
  $('#modelStage')?.addEventListener('click', e => {
    const partEl = e.target.closest('[data-model-part]');
    const part = partEl?.dataset.modelPart || 'Model';
    selectModelPart(part);
    if (modelState.mode === 'paint' && partEl) {
      paintModelPart(part, modelState.color);
      partEl.classList.add('selected');
    } else if (modelState.mode === 'pin') {
      modelState.pending = { ...modelPoint(e), part };
      renderModelStage();
      $('#modelNoteText')?.focus();
    }
  });
  $('#saveModelPin')?.addEventListener('click', () => {
    const text = $('#modelNoteText').value.trim();
    if (!modelState.pending) return alert('Klik først på en del af modellen.');
    if (!text) return alert('Skriv en kort note til den valgte del.');
    modelState.pins.push({ ...modelState.pending, text });
    modelState.pending = null;
    $('#modelNoteText').value = '';
    renderModelStage();
    renderModelPinList();
  });
  $('#modelPinList')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-delete-model-pin]');
    if (!btn) return;
    modelState.pins.splice(Number(btn.dataset.deleteModelPin), 1);
    renderModelStage();
    renderModelPinList();
  });
  $('#resetModel')?.addEventListener('click', () => {
    const template = modelState.template;
    modelState = { template, mode: 'paint', color: modelColors[0], colors: {}, pins: [], selectedPart: '', pending: null };
    $('#modelNoteText').value = '';
    $('#modelSelectedPart').textContent = 'Ingen del valgt';
    renderModelDialog();
  });
  $('#insertModel')?.addEventListener('click', insertInteractiveModel);

  $('#toggleWidgets')?.addEventListener('click', () => {
    data.ui.widgetsOpen = !data.ui.widgetsOpen;
    persist(); syncWidgetsVisibility();
  });
  $('#toggleDarkMode')?.addEventListener('click', toggleDarkMode);
  initColorThemePicker();
  $('#toggleThemePicker')?.addEventListener('click', event => {
    event.stopPropagation();
    toggleThemePicker();
  });

  $('#globalSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    if (!q) return;
    const hit = data.pages.find(p => `${p.title} ${p.html || ''}`.toLowerCase().includes(q));
    if (hit) selectPage(hit.id);
  });

  $('#widgetsPanel')?.addEventListener('mousedown', e => {
    const sel = window.getSelection();
    if (sel?.rangeCount && $('#editor')?.contains(sel.anchorNode)) captureEditorRange();
  });

  $('#widgetsPanel')?.addEventListener('click', e => {
    const sideAction = e.target.closest('[data-side-action]');
    if (sideAction) {
      if (sideAction.dataset.sideAction === 'layout') openLayoutDialog();
      if (sideAction.dataset.sideAction === 'dictation') startDictationToNotes();
      if (sideAction.dataset.sideAction === 'pencil') {
        if (!requireLogin('Apple Pencil og tegneværktøjer kræver en profil.')) return;
        activeWritingTool = { type: 'pen', color: '#1f2937' };
        activePage().viewMode = 'annotate';
        persist(); renderWorkspace(); renderWidgets();
      }
      if (sideAction.dataset.sideAction === 'models') {
        if (!requireLogin('Interaktive modeller kræver en profil.')) return;
        openModelDialog();
      }
      if (sideAction.dataset.sideAction === 'shortcuts') openShortcutGuide();
      if (sideAction.dataset.sideAction === 'stickers') openStickyPicker();
      if (sideAction.dataset.sideAction === 'annotate') {
        if (!requireLogin('PDF markering og tegneværktøjer kræver en profil.')) return;
        activePage().viewMode = activePage().viewMode === 'annotate' ? 'write' : 'annotate';
        persist(); renderWorkspace(); renderWidgets();
      }
      return;
    }
    if (e.target.closest('[data-side-pdf]')) { openPdfDialog(); setTimeout(() => $('#pdfFile')?.click(), 80); return; }
    const pointer = e.target.closest('[data-writing-pointer]');
    const marker = e.target.closest('[data-marker-color]');
    const eraser = e.target.closest('[data-annotation-tool="eraser"]');
    if (pointer || marker || eraser) {
      if (!requireLogin('Penalhuset kræver en profil.')) return;
      if (pointer || (marker && activeWritingTool.type === 'marker' && activeWritingTool.color === marker.dataset.markerColor)) {
        activeWritingTool = { type: 'pointer', color: '' };
      } else if (marker) {
        activeWritingTool = { type: 'marker', color: marker.dataset.markerColor };
      } else {
        activeWritingTool = { type: 'eraser', color: '' };
        if (activePage() && activePage().viewMode !== 'annotate') activePage().viewMode = 'annotate';
      }
      document.body.classList.remove('marker-cursor', 'eraser-cursor');
      if (activeWritingTool.type !== 'pointer') document.body.classList.add(`${activeWritingTool.type}-cursor`);
      persist(); renderWorkspace(); renderWidgets(); return;
    }
    const aiBtn = e.target.closest('[data-widget-ai]');
    if (aiBtn) { runQuickStudyHelp(aiBtn.dataset.widgetAi); return; }
    const codeTemplate = e.target.closest('[data-code-template]');
    if (codeTemplate) { insertCodeTemplate(codeTemplate.dataset.codeTemplate); return; }
    const tool = e.target.closest('[data-widget-tool]');
    if (tool) { handleWidgetTool(tool.dataset.widgetTool); return; }
    const formula = e.target.closest('[data-formula]');
    if (formula && $('#editor')) {
      insertHtml(`<div class="equation">${escapeHtml(formula.dataset.formula || formula.textContent.trim())}</div><p><br></p>`);
    }
  });
  $('#widgetsPanel')?.addEventListener('dragover', e => {
    if (!e.target.closest('[data-side-pdf]')) return;
    e.preventDefault();
    e.target.closest('[data-side-pdf]').classList.add('dragging');
  });
  $('#widgetsPanel')?.addEventListener('dragleave', e => e.target.closest('[data-side-pdf]')?.classList.remove('dragging'));
  $('#widgetsPanel')?.addEventListener('drop', e => {
    const zone = e.target.closest('[data-side-pdf]');
    if (!zone) return;
    e.preventDefault();
    zone.classList.remove('dragging');
    const file = [...e.dataTransfer.files].find(item => item.type === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf'));
    if (!file) return alert('Slip en PDF-fil i feltet.');
    openPdfDialog();
    const transfer = new DataTransfer();
    transfer.items.add(file);
    $('#pdfFile').files = transfer.files;
    $('#pdfStatus').textContent = `${file.name} er klar. PDF'en må højst være 6 sider.`;
  });

  $('#subjects')?.addEventListener('click', e => {
    const renameTarget = e.target.closest('[data-rename-notebook], [data-rename-subject], [data-rename-page]');
    if (renameTarget) {
      e.preventDefault();
      e.stopPropagation();
      startInlineRename(renameTarget);
      return;
    }
    const programToggle = e.target.closest('[data-toggle-program]');
    if (programToggle) {
      const program = programToggle.dataset.toggleProgram;
      data.ui.programOpen[program] = data.ui.programOpen[program] === false;
      persist();
      renderSubjects();
      return;
    }
    const pageButton = e.target.closest('[data-page]');
    if (pageButton) {
      selectPage(pageButton.dataset.page);
      return;
    }
    const deletePage = e.target.closest('[data-delete-page]');
    if (deletePage) {
      const page = data.pages.find(item => item.id === deletePage.dataset.deletePage);
      if (!page || !confirm(`Flyt "${page.title || 'Uden titel'}" til Sidst slettet?\n\nNoten slettes automatisk efter 24 timer.`)) return;
      movePageToTrash(page.id);
      persist();
      render();
      return;
    }
    const addTopic = e.target.closest('[data-add-topic]');
    if (addTopic) {
      openPageDialog(addTopic.dataset.addTopic);
      return;
    }
    const semToggle = e.target.closest('[data-toggle-semester]');
    if (semToggle) {
      const id = semToggle.dataset.toggleSemester;
      const isOpen = data.ui.semesterOpen[id] !== false;
      data.ui.semesterOpen[id] = !isOpen;
      persist();
      renderSemesters();
      renderSubjects();
      return;
    }
    const del = e.target.closest('[data-delete-subject]');
    if (del) {
      const s = data.subjects.find(x => x.id === del.dataset.deleteSubject);
      const n = data.pages.filter(p => p.subjectId === s.id).length;
      if (!confirm(`Slet "${s.name}" og flyt ${n} dokumenter til Sidst slettet?\n\nNoterne fjernes automatisk efter 24 timer.`)) return;
      data.pages.filter(page => page.subjectId === s.id).forEach(page => {
        data.trash.unshift({ ...page, deletedAt: new Date().toISOString() });
      });
      data.subjects = data.subjects.filter(x => x.id !== s.id);
      data.pages = data.pages.filter(p => p.subjectId !== s.id);
      if (data.currentSubject === s.id) { data.currentSubject = data.subjects[0]?.id || null; data.currentPage = null; }
      persist(); render(); return;
    }
    const subjectToggle = e.target.closest('[data-toggle-subject]');
    if (subjectToggle) {
      const id = subjectToggle.dataset.toggleSubject;
      data.ui.subjectOpen[id] = !data.ui.subjectOpen[id];
      data.currentSubject = id;
      data.currentPage = null;
      data.ui.view = 'home';
      persist();
      render();
      return;
    }
  });
  $('#recentlyDeleted')?.addEventListener('click', e => {
    const restore = e.target.closest('[data-restore-page]');
    if (restore) {
      const page = data.trash.find(item => item.id === restore.dataset.restorePage);
      if (!page) return;
      const { deletedAt, ...restoredPage } = page;
      data.trash = data.trash.filter(item => item.id !== page.id);
      data.pages.push(restoredPage);
      data.currentSubject = restoredPage.subjectId;
      data.currentPage = restoredPage.id;
      data.ui.view = 'home';
      persist();
      render();
      return;
    }
    const purge = e.target.closest('[data-purge-page]');
    if (purge) {
      const page = data.trash.find(item => item.id === purge.dataset.purgePage);
      if (!page || !confirm(`Slet "${page.title || 'Uden titel'}" permanent?`)) return;
      data.trash = data.trash.filter(item => item.id !== page.id);
      persist();
      renderRecentlyDeleted();
    }
  });

  $('#subjectColors')?.addEventListener('click', e => {
    if (!e.target.dataset.color) return;
    selectedColor = e.target.dataset.color;
    document.querySelectorAll('#subjectColors .swatch').forEach(item => item.classList.toggle('selected', item.dataset.color === selectedColor));
  });
  $('#subjectColors')?.addEventListener('input', e => {
    if (e.target.id !== 'customSubjectColor') return;
    selectedColor = e.target.value;
    document.querySelectorAll('#subjectColors .swatch').forEach(item => item.classList.remove('selected'));
    e.target.closest('.custom-swatch')?.style.setProperty('--custom-color', selectedColor);
  });

  $('#notebookColors')?.addEventListener('click', e => {
    const button = e.target.closest('[data-notebook-color]');
    if (!button) return;
    selectedNotebookColor = button.dataset.notebookColor;
    document.querySelectorAll('#notebookColors .swatch').forEach(item => item.classList.toggle('selected', item === button));
  });
  $('#notebookForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const program = $('#notebookEducation').value || 'bachelor';
    const year = Number($('#notebookLevel').value) || 1;
    const notebook = {
      id: uid(),
      name: $('#notebookName').value.trim(),
      program,
      year,
      color: selectedNotebookColor,
      sort: data.semesters.length,
    };
    data.semesters.push(notebook);
    data.ui.notebookIndex = data.semesters.length - 1;
    data.ui.semesterOpen[notebook.id] = true;
    data.ui.view = 'notebook';
    persist();
    $('#notebookDialog').close();
    render();
  });

  $('#subjectForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const id = uid();
    const semesterId = $('#subjectForm').dataset.semesterId;
    const semester = data.semesters.find(item => item.id === semesterId);
    if (!semester) return;
    data.subjects.push({
      id,
      name: $('#subjectName').value.trim(),
      color: selectedColor,
      semesterId: semester.id,
    });
    data.ui.semesterOpen[semester.id] = true;
    data.ui.subjectOpen[id] = true;
    data.currentSubject = id;
    data.currentPage = null;
    persist();
    $('#subjectDialog').close();
    render();
  });

  $('#stickyColors')?.addEventListener('click', e => {
    const button = e.target.closest('[data-sticky-color]');
    if (!button) return;
    selectedStickyColor = button.dataset.stickyColor;
    document.querySelectorAll('#stickyColors .sticky-color-choice').forEach(item => item.classList.toggle('selected', item === button));
  });
  $('#stickyForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const size = $('#stickySize').value || 'medium';
    const stickyHtml = `<div class="sticky-note sticky-${size}" data-sticky contenteditable="false" style="--sticky-color:${selectedStickyColor};--sticky-x:0px;--sticky-y:0px"><button type="button" class="sticky-delete" contenteditable="false" title="Fjern sticky note">×</button><span class="sticky-pin"></span><div class="sticky-content" contenteditable="true">Skriv en vigtig note...</div></div><p><br></p>`;
    $('#stickyDialog').close();
    setTimeout(() => insertHtml(stickyHtml), 50);
  });

  initUniversalCloseHandlers();
  initInteractiveToolFeedback();
  initDocCategoryPicker();
  initIdeTerminal();

  $('#translateLangGrid')?.addEventListener('click', e => {
    const btn = e.target.closest('.lang-btn');
    if (!btn) return;
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const doBtn = $('#doTranslate');
    if (doBtn) { doBtn.disabled = false; doBtn.textContent = `Oversæt til ${btn.dataset.lang}`; }
  });

  $('#doTranslate')?.addEventListener('click', async () => {
    const selectedBtn = document.querySelector('.lang-btn.selected');
    if (!selectedBtn || !translateSourceText) return;
    const lang = selectedBtn.dataset.lang;
    const result = $('#translateResult');
    const doBtn = $('#doTranslate');
    doBtn.disabled = true;
    doBtn.textContent = 'Oversætter…';
    showAiLoading(result, `Oversætter til ${lang}…`);
    try {
      const translated = await requestOpenAI({
        instructions: `Du er professionel oversætter. Oversæt den medfølgende tekst til ${lang}. Bevar al formatering (overskrifter, punkter, fed tekst). Oversæt KUN — tilføj ingen kommentarer eller forklaringer.`,
        input: translateSourceText,
      });
      translateResultHtml = simpleMarkdownToHtml(translated);
      result.innerHTML = translateResultHtml;
      $('#translateActions')?.classList.add('hidden');
      $('#translateInsertActions')?.classList.remove('hidden');
    } catch {
      result.className = 'ai-result visible error';
      result.innerHTML = '<p>Oversættelse mislykkedes. Tjek forbindelsen og prøv igen.</p>';
      doBtn.disabled = false;
      doBtn.textContent = `Oversæt til ${lang}`;
    }
  });

  $('#translateAgain')?.addEventListener('click', () => {
    const result = $('#translateResult');
    if (result) result.innerHTML = '';
    translateResultHtml = '';
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
    const doBtn = $('#doTranslate');
    if (doBtn) { doBtn.disabled = true; doBtn.textContent = 'Oversæt'; }
    $('#translateActions')?.classList.remove('hidden');
    $('#translateInsertActions')?.classList.add('hidden');
  });

  $('#insertTranslation')?.addEventListener('click', () => {
    if (!translateResultHtml) return;
    if (!$('#editor')) return alert('Åbn en note, før oversættelsen indsættes.');
    const html = translateResultHtml;
    $('#translateDialog')?.close();
    setTimeout(() => insertHtml(`<section class="stem-block pdf-generated"><h4>Oversættelse</h4>${html}</section><p><br></p>`), 50);
  });

  $('#codeForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const code = $('#codeInput').value.trim();
    if (!code) return;
    const lang = escapeHtml($('#language').value);
    const libraries = $('#codeLibraries').value.trim();
    const codeHtml = `<div class="code-block" data-language="${lang}" contenteditable="false">${libraries ? `<div class="code-libraries">Pakker: ${escapeHtml(libraries)}</div>` : ''}<pre><code contenteditable="true">${escapeHtml(code)}</code></pre></div><p><br></p>`;
    $('#codeDialog').close();
    setTimeout(() => insertHtml(codeHtml), 50);
  });
  $('#language')?.addEventListener('change', () => renderCodeLanguageStrip());
  $('#codeLanguageStrip')?.addEventListener('click', event => {
    const choice = event.target.closest('[data-code-language-choice]');
    if (!choice) return;
    setCodeDialogLanguage(choice.dataset.codeLanguageChoice);
  });

  function plainCodeHelp(text) {
    return String(text || '')
      .replace(/\p{Extended_Pictographic}|\uFE0F/gu, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async function runCodeAI(mode) {
    const result = $('#aiResult');
    const buttons = [$('#fixCode'), $('#explainCode')].filter(Boolean);
    const code = $('#codeInput').value.trim();
    if (!code) {
      result.className = 'ai-result visible error';
      result.textContent = 'Skriv eller indsæt kode først.';
      return;
    }
    showAiLoading(result, mode === 'fix' ? 'Kontrollerer koden…' : 'Læser koden…');
    buttons.forEach(button => { button.disabled = true; });
    try {
      const lang = $('#language').value;
      const libraries = $('#codeLibraries').value.trim() || 'Ingen angivet';
      const instr = mode === 'fix'
        ? 'Du er en erfaren softwareudvikler. Ret syntaksfejl, åbenlyse logiske fejl og usikker kode uden at ændre formålet. Bevar valgte libraries og versionsantagelser. Returnér kun den komplette rettede kode uden markdown, forklaringer, emojis eller dekorative symboler.'
        : 'Du er en erfaren underviser i programmering. Forklar præcist hvad koden gør, hvordan data flyder, hvilke fejlrisici der findes, og hvad der kan forbedres. Brug korte afsnit og ren tekst på dansk. Brug ingen emojis eller dekorative symboler.';
      const answer = await callAI(instr, `Programmeringssprog: ${lang}\nLibraries og pakker: ${libraries}\n\nKode:\n${code}`);
      if (mode === 'fix') {
        $('#codeInput').value = answer.replace(/^```[^\n]*\n|```$/g, '').trim();
        result.textContent = 'Koden er kontrolleret og opdateret.';
      } else {
        result.textContent = plainCodeHelp(answer);
      }
    } catch (err) {
      result.className = 'ai-result visible error';
      result.textContent = err.message;
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  }
  $('#fixCode')?.addEventListener('click', () => runCodeAI('fix'));
  $('#explainCode')?.addEventListener('click', () => runCodeAI('explain'));
  function runJavaScriptSandbox(code) {
    return new Promise((resolve, reject) => {
      const channel = `noteit-code-${uid()}`;
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.hidden = true;
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Kørslen tog for lang tid og blev stoppet.'));
      }, 3000);
      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        iframe.remove();
      };
      const receive = event => {
        if (event.source !== iframe.contentWindow || event.data?.channel !== channel) return;
        cleanup();
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data.output || []);
      };
      window.addEventListener('message', receive);
      const safeCode = String(code).replace(/<\/script/gi, '<\\/script');
      iframe.srcdoc = `<script>
        const output = [];
        const console = { log: (...values) => output.push(values.map(value => {
          try { return typeof value === 'object' ? JSON.stringify(value) : String(value); }
          catch { return String(value); }
        }).join(' ')) };
        try {
          ${safeCode}
          parent.postMessage({ channel: ${JSON.stringify(channel)}, output }, '*');
        } catch (error) {
          parent.postMessage({ channel: ${JSON.stringify(channel)}, error: String(error && error.message || error) }, '*');
        }
      <\/script>`;
      document.body.appendChild(iframe);
    });
  }
  $('#runCode')?.addEventListener('click', async () => {
    const result = $('#aiResult');
    const language = $('#language').value;
    const code = $('#codeInput').value;
    result.className = 'ai-result visible code-run-result';
    if (!code.trim()) { result.textContent = 'Skriv kode først.'; return; }
    if (language === 'JavaScript') {
      try {
        const output = await runJavaScriptSandbox(code);
        result.innerHTML = `<b>Kørsel færdig</b><pre>${escapeHtml(output.join('\n') || 'Programmet afsluttede uden output.')}</pre>`;
      } catch (error) {
        result.innerHTML = `<b>Kørselsfejl</b><pre>${escapeHtml(error.message)}</pre>`;
      }
      return;
    }
    if (language === 'HTML') {
      const preview = window.open(`data:text/html;charset=utf-8,${encodeURIComponent(code)}`, '_blank', 'noopener,noreferrer,width=900,height=650');
      result.textContent = preview ? 'HTML-forhåndsvisningen er åbnet.' : 'Tillad pop-up for at vise HTML.';
      return;
    }
    const commands = {
      Python: 'python3 fil.py', R: 'Rscript fil.R', MATLAB: 'Kør i MATLAB', Julia: 'julia fil.jl', C: 'clang fil.c -o program',
      'C++': 'clang++ fil.cpp -o program', 'C#': 'dotnet run', Java: 'javac Main.java && java Main', Kotlin: 'kotlinc Main.kt',
      Swift: 'swift fil.swift', Rust: 'cargo run', Go: 'go run fil.go', Ruby: 'ruby fil.rb', PHP: 'php fil.php',
      Dart: 'dart run', Scala: 'scala fil.scala', Haskell: 'runghc fil.hs', Lua: 'lua fil.lua', Bash: 'bash fil.sh',
      PowerShell: 'pwsh fil.ps1', SQL: 'Kør mod den valgte database', Arduino: 'Verificér og upload med Arduino CLI',
      ESP32: 'Verificér og upload med PlatformIO', 'ROS / Python': 'ros2 run pakke node', Verilog: 'iverilog fil.v',
      VHDL: 'ghdl -a fil.vhd', Assembly: 'Brug assembleren til din arkitektur', Solidity: 'solc kontrakt.sol',
      TypeScript: 'npx tsx fil.ts',
    };
    result.innerHTML = `<b>Klar til kompilering</b><p>${escapeHtml(commands[language] || 'Vælg et compiler-miljø til sproget.')}</p><small>Note'it kontrollerer og organiserer koden her. Native kompilering kræver, at det valgte sprog og dets compiler er installeret.</small>`;
  });

  $('#aiForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!requireStudyHelp()) return;
    const from = Math.max(1, Number($('#lineFrom').value));
    const to = Math.max(from, Number($('#lineTo').value));
    const selected = noteLines().slice(from - 1, to).join('\n').trim() || editorDocumentText();
    const action = $('#aiAction').value;
    const result = $('#noteAiResult');
    showAiLoading(result, 'Studiehjælp læser…');
    try {
      const answer = await callAI(studyHelpPrompts[action] || studyHelpPrompts.explain, selected, {
        action,
        context: currentStudyContext({ selectedLines: { from, to } }),
      });
      const p = activePage();
      if (!p) return;
      p.comments = p.comments || [];
      p.comments.push({
        type: studyHelpLabels[action] || 'Studiehjælp',
        from,
        to,
        text: answer,
        replacement: action === 'proofread' ? answer : '',
        history: [
          { role: 'user', content: selected },
          { role: 'assistant', content: answer },
        ],
      });
      persist();
      closeAppDialog('ai');
      renderWorkspace();
    } catch (err) { result.className = 'ai-result visible error'; result.textContent = err.message; }
  });

  $('#mathForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const latex = $('#mathInput').value.trim();
    if (!latex) return;
    const mathHtml = `<div class="math-render equation" data-latex="${escapeHtml(latex)}" contenteditable="false"></div><p><br></p>`;
    $('#mathDialog').close();
    setTimeout(() => { insertHtml(mathHtml); setTimeout(renderMathInEditor, 50); }, 50);
  });
  $('#mathInput')?.addEventListener('input', () => {
    const prev = $('#mathPreview');
    if (prev && typeof katex !== 'undefined') try { katex.render($('#mathInput').value, prev, { throwOnError: false, displayMode: true }); } catch { prev.textContent = ''; }
  });

  $('#pdfOutputType')?.addEventListener('change', updatePdfScanBtn);

  document.querySelector('.pdf-source-tabs')?.addEventListener('click', e => {
    const tab = e.target.closest('[data-pdf-source]');
    if (!tab) return;
    pdfSourceMode = tab.dataset.pdfSource;
    document.querySelectorAll('[data-pdf-source]').forEach(btn => btn.classList.toggle('active', btn === tab));
    $('#pdfFileSource').classList.toggle('hidden', pdfSourceMode !== 'file');
    $('#pdfTextSource').classList.toggle('hidden', pdfSourceMode !== 'text');
    $('#pdfStatus').textContent = pdfSourceMode === 'file'
      ? 'PDF-filer scannes grundigt side for side og må højst indeholde 8 sider.'
      : 'Kopieret tekst behandles uden sidetal.';
  });

  $('#pdfForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const file = $('#pdfFile').files[0];
    const copiedText = $('#pdfCopiedText').value.trim();
    const topic = $('#quoteTopic').value.trim();
    const outputType = $('#pdfOutputType').value;
    const classLevel = $('#pdfClassLevel').value;
    const status = $('#pdfStatus'), result = $('#quoteResult');
    if (pdfSourceMode === 'file' && !file) return alert('Vælg en PDF-fil.');
    if (pdfSourceMode === 'text' && !copiedText) return alert('Indsæt tekst først.');
    function showPdfLoadingSpinner(label, totalPages) {
      showAiLoading(result, label, totalPages > 1 ? totalPages : 0);
    }
    function updatePdfDot(i, state) {
      const dot = document.getElementById(`pdfdot${i}`);
      if (dot) dot.className = state;
    }

    try {
      showAiLoading(result, 'Læser PDF…');
      let pages = [];
      if (pdfSourceMode === 'file') {
        const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        if (pdf.numPages > 8) throw new Error(`PDF må højst være 8 sider. Denne PDF har ${pdf.numPages} sider.`);
        for (let n = 1; n <= pdf.numPages; n++) {
          status.textContent = `Indlæser side ${n} af ${pdf.numPages}...`;
          const pg = await pdf.getPage(n);
          const content = await pg.getTextContent();
          pages.push({ number: n, text: content.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim() });
        }
        if (pages.every(page => !page.text)) throw new Error('PDF\'en indeholder ikke læsbar tekst. Prøv en tekstbaseret PDF eller indsæt teksten manuelt.');
      } else {
        pages = [{ number: null, text: copiedText }];
      }
      const lang = activePage()?.language || 'dansk';
      let combinedMarkdown = '';
      if (pdfSourceMode === 'file' && outputType === 'notes' && pages.length > 0) {
        showPdfLoadingSpinner(`Analyserer side 1 af ${pages.length}…`, pages.length);
        for (let i = 0; i < pages.length; i++) {
          const pg = pages[i];
          status.textContent = `Analyserer side ${pg.number} af ${pages.length}…`;
          updatePdfDot(i, 'active');
          let pageMarkdown;
          try {
            pageMarkdown = await requestOpenAI({
              instructions: 'Du er et præcist noteværktøj. Følg instrukserne nøjagtigt. Brug ALDRIG viden fra uden for den givne sidetekst. Ingen fyldtekst. Høj informationsdensitet.',
              input: pdfPageNotesPrompt(pg.text, pg.number, pages.length, topic, classLevel, lang),
            });
          } catch {
            pageMarkdown = localPdfPageNotes(pg, pages.length, topic);
          }
          combinedMarkdown += pageMarkdown.trim() + '\n\n';
          updatePdfDot(i, 'done');
          pdfGeneratedHtml = simpleMarkdownToHtml(combinedMarkdown);
          const remaining = pages.length - i - 1;
          if (remaining > 0) {
            const nextLabel = `Analyserer side ${i + 2} af ${pages.length}…`;
            result.className = 'ai-result visible';
            result.innerHTML = `<div class="pdf-result-preview">${pdfGeneratedHtml}</div><div class="pdf-loading" style="margin-top:16px"><div class="pdf-pencil">${AI_PENCIL_SVG}</div><div class="pdf-loading-line"></div><div class="pdf-loading-label">${escapeHtml(nextLabel)}</div><div class="pdf-page-dots">${pages.map((_, j) => `<span class="${j < i + 1 ? 'done' : j === i + 1 ? 'active' : ''}"></span>`).join('')}</div></div>`;
          }
        }
      } else {
        showPdfLoadingSpinner('Genererer studiemateriale…', 0);
        status.textContent = 'Behandler sider…';
        try {
          combinedMarkdown = await requestOpenAI({
            instructions: 'Følg reglerne præcist. Brug aldrig viden, som ikke findes i brugerens materiale.',
            input: pdfPrompt(outputType, topic, classLevel, pages),
          });
        } catch {
          combinedMarkdown = localPdfMaterial(pages, outputType, topic, classLevel);
        }
        pdfGeneratedHtml = simpleMarkdownToHtml(combinedMarkdown);
      }
      if (!hasPremium()) {
        updateCurrentAccount(account => {
          account.usage ||= { pdf: 0, understanding: 0 };
          account.usage.pdf = Number(account.usage.pdf || 0) + 1;
        });
      }
      result.className = 'ai-result visible pdf-result';
      result.innerHTML = `${pdfGeneratedHtml}<div class="pdf-result-actions"><button type="button" class="btn-primary" id="insertPdfMaterial">✓ Indsæt i noter</button></div>`;
      status.textContent = pdfSourceMode === 'file'
        ? `Færdig — ${pages.length} side${pages.length === 1 ? '' : 'r'} analyseret. Tryk "Indsæt i noter" for at føje dem til papiret.`
        : 'Færdig. Tryk "Indsæt i noter" for at føje dem til papiret.';
    } catch (err) {
      status.textContent = 'Kunne ikke behandle materialet.';
      result.className = 'ai-result visible error';
      const isConnErr = /fetch|forbind|netværk|network|Failed to fetch/i.test(err.message);
      result.innerHTML = `<b>Fejl:</b> ${escapeHtml(err.message)}${isConnErr ? '<br><small>Tjek din internetforbindelse og prøv igen.</small>' : ''}`;
    }
  });

  $('#settingsForm')?.addEventListener('submit', e => {
    e.preventDefault();
    appSettings.interfaceLanguage = $('#interfaceLanguage').value;
    appSettings.defaultLanguage = $('#defaultNoteLanguage').value;
    appSettings.country = $('#countrySetting').value;
    appSettings.studyField = normalizeStudyField($('#studyFieldSetting').value || 'mathematics');
    appSettings.apiBase = String($('#apiBaseSetting')?.value || '').trim().replace(/\/$/, '');
    appSettings.autoCorrect = $('#autoCorrectSetting').checked;
    if (appSettings.apiBase) localStorage.setItem('noteit-api-base', appSettings.apiBase);
    else localStorage.removeItem('noteit-api-base');
    if (isGuest()) {
      showGuestSaveNotice();
    } else {
      const serialized = JSON.stringify(appSettings);
      localStorage.setItem('stemnotes-settings', serialized);
      const email = activeAccountEmail();
      if (email) localStorage.setItem(accountStorageKey(email, 'settings'), serialized);
      saveSettingsToProfile();
    }
    applyUiLanguage();
    $('#settingsDialog').close();
    render();
  });

  $('#apiBaseSetting')?.addEventListener('input', e => {
    appSettings.apiBase = String(e.target.value || '').trim().replace(/\/$/, '');
    syncCursorApiSettings();
  });

  $('#copyCursorEndpoint')?.addEventListener('click', async () => {
    const endpoint = cursorApiEndpoint();
    try {
      await navigator.clipboard?.writeText(endpoint);
      alert('Cursor endpoint er kopieret.');
    } catch {
      prompt('Kopiér Cursor endpoint:', endpoint);
    }
  });

  $('#openSettings')?.addEventListener('click', () => {
    $('#interfaceLanguage').innerHTML = interfaceLanguageOptions(appSettings.interfaceLanguage);
    $('#defaultNoteLanguage').innerHTML = languageOptions(appSettings.defaultLanguage);
    $('#countrySetting').innerHTML = countryOptions(appSettings.country || 'DK');
    const settingsField = $('#studyFieldSetting');
    if (settingsField) settingsField.innerHTML = studyFieldOptions(appSettings.studyField || 'mathematics');
    syncStudyFieldPicker($('#settingsStudyFieldGrid'), appSettings.studyField || 'mathematics', settingsField);
    bindStudyFieldPicker($('#settingsStudyFieldGrid'), settingsField);
    $('#autoCorrectSetting').checked = appSettings.autoCorrect !== false;
    if ($('#fixedStudyModel')) $('#fixedStudyModel').textContent = NOTEIT_STUDY_MODEL;
    if ($('#fixedAppVersion')) $('#fixedAppVersion').textContent = `${NOTEIT_APP_VERSION}${appBuildLabel() ? ` · Build ${appBuildLabel()}` : ''}`;
    updateSettingsStorageInfo();
    syncCursorApiSettings();
    $('#settingsDialog').showModal();
  });

  $('.topbar-avatar')?.addEventListener('click', () => {
    if (isGuest()) {
      showGuestSaveNotice();
      return;
    }
    $('#profileImageInput')?.click();
  });
  $('#profileImageInput')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Vælg en billedfil.');
    try {
      const avatar = await resizeProfileImage(file);
      const session = getSession();
      const accounts = getAccounts();
      const account = accounts.find(item => normalizedEmail(item.email) === normalizedEmail(session?.email));
      if (!account) return alert('Log ind for at gemme et profilbillede.');
      account.avatar = avatar;
      localStorage.setItem('noteit-accounts', JSON.stringify(accounts));
      renderProfileStatus();
    } catch (error) {
      alert(error.message);
    } finally {
      event.target.value = '';
    }
  });

  $('#openExam')?.addEventListener('click', openExamDialog);
  document.querySelector('.auth-tabs')?.addEventListener('click', e => {
    const button = e.target.closest('[data-auth-tab]');
    if (!button) return;
    document.querySelectorAll('[data-auth-tab]').forEach(item => item.classList.toggle('active', item === button));
    document.querySelectorAll('[data-auth-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.authPanel === button.dataset.authTab));
  });
  $('#loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = normalizedEmail($('#loginEmail').value);
    const accounts = getAccounts();
    const account = accounts.find(item => normalizedEmail(item.email) === email);
    const password = $('#loginPassword').value;
    const candidateHash = account
      ? await passwordHash(password, account.passwordSalt)
      : '';
    if (!account || account.passwordHash !== candidateHash) {
      $('#loginError').textContent = 'E-mail eller adgangskode er forkert.'; return;
    }
    if ($('#loginRememberEmail')?.checked) {
      localStorage.setItem(REMEMBER_LOGIN_KEY, '1');
      localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_LOGIN_KEY);
      localStorage.removeItem(LAST_LOGIN_EMAIL_KEY);
      localStorage.setItem(LOGIN_EMAIL_HINT_KEY, email);
    }
    if (!account.passwordSalt) {
      account.passwordSalt = passwordSalt();
      account.passwordHash = await passwordHash(password, account.passwordSalt);
      account.passwordUpdatedAt = new Date().toISOString();
      localStorage.setItem('noteit-accounts', JSON.stringify(accounts));
    }
    localStorage.removeItem('noteit-guest');
    localStorage.setItem('noteit-session', email);
    aiSettings = { model: 'gpt-4.1-mini' };
    loadAccountState(account);
    applyProfile(account);
    data.ui.view = 'notebook';
    $('#welcomeDialog').close();
    location.hash = '#/app';
    route();
    scheduleStartupGuide();
  });
  $('#signupCountry')?.addEventListener('change', e => {
    const defaults = { DK:'da', SE:'sv', NO:'no', FI:'fi', IS:'is', GB:'en', US:'en', DE:'de', FR:'fr', ES:'es', IT:'it', NL:'nl', PL:'pl', PT:'pt', IN:'hi', CN:'zh-CN', JP:'ja', KR:'ko', BR:'pt', MX:'es', AE:'ar' };
    const language = defaults[e.target.value] || 'en';
    $('#signupNoteLanguage').value = language;
    if (['da','en','sv','no','fr','es'].includes(language)) $('#signupInterfaceLanguage').value = language;
  });
  $('#signupForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const accounts = getAccounts();
    const email = normalizedEmail($('#signupEmail').value);
    if (accounts.some(item => normalizedEmail(item.email) === email)) {
      $('#signupError').textContent = 'Denne e-mail er allerede registreret. Log ind eller vælg “Glemt adgangskode?”.';
      return;
    }
    const salt = passwordSalt();
    const account = {
      name: $('#signupName').value.trim(),
      email,
      passwordSalt: salt,
      passwordHash: await passwordHash($('#signupPassword').value, salt),
      createdAt: new Date().toISOString(),
      settings: {
        country: $('#signupCountry').value,
        interfaceLanguage: $('#signupInterfaceLanguage').value,
        defaultLanguage: $('#signupNoteLanguage').value,
        studyField: normalizeStudyField($('#signupStudyField').value || 'mathematics'),
        autoCorrect: true,
      },
    };
    accounts.push(account);
    localStorage.setItem('noteit-accounts', JSON.stringify(accounts));
    initializeAccountState(account);
    localStorage.removeItem('noteit-guest');
    localStorage.setItem('noteit-session', email);
    aiSettings = { model: 'gpt-4.1-mini' };
    loadAccountState(account);
    applyProfile(account);
    data.ui.view = 'notebook';
    $('#welcomeDialog').close();
    location.hash = '#/app';
    route();
    scheduleStartupGuide();
  });
  $('#logoutButton')?.addEventListener('click', () => {
    localStorage.removeItem('noteit-session');
    localStorage.removeItem('noteit-guest');
    sessionStorage.removeItem('noted-guest');
    location.hash = '';
    route();
  });
  $('#closeAuthDialog')?.addEventListener('click', () => $('#welcomeDialog')?.close());
  $('#forgotPassword')?.addEventListener('click', () => {
    $('#resetEmail').value = normalizedEmail($('#loginEmail')?.value);
    $('#resetPassword').value = '';
    $('#resetPasswordConfirm').value = '';
    $('#resetError').textContent = '';
    $('#resetSuccess').textContent = '';
    const resetToken = new URLSearchParams(location.search).get('token');
    $('#resetCompletionFields')?.classList.toggle('hidden', !resetToken);
    $('#completePasswordReset')?.classList.toggle('hidden', !resetToken);
    $('#sendResetEmail')?.classList.toggle('hidden', Boolean(resetToken));
    $('#passwordResetDialog')?.showModal();
  });
  document.querySelectorAll('[data-close="passwordReset"]').forEach(button => {
    button.addEventListener('click', () => closeAppDialog('passwordReset'));
  });
  $('#sendResetEmail')?.addEventListener('click', async () => {
    const email = normalizedEmail($('#resetEmail').value);
    const error = $('#resetError');
    const success = $('#resetSuccess');
    error.textContent = '';
    success.textContent = '';
    if (!email) {
      error.textContent = 'Skriv din e-mail først.';
      return;
    }
    try {
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Mailen kunne ikke sendes.');
      success.textContent = "Hvis e-mailen findes, er der sendt et link fra Note'it. Linket gælder i 30 minutter.";
    } catch {
      error.textContent = 'Nulstillingsmailen kunne ikke sendes. Prøv igen online eller kontakt support. Adgangskoden ændres ikke lokalt uden mailbekræftelse.';
    }
  });
  $('#passwordResetForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const token = new URLSearchParams(location.search).get('token');
    const password = $('#resetPassword').value;
    const confirmPassword = $('#resetPasswordConfirm').value;
    const error = $('#resetError');
    const success = $('#resetSuccess');
    error.textContent = '';
    success.textContent = '';
    if (!token) {
      error.textContent = 'Brug det tidsbegrænsede link fra nulstillingsmailen.';
      return;
    }
    if (password !== confirmPassword) {
      error.textContent = 'De to adgangskoder er ikke ens.';
      return;
    }
    try {
      const response = await fetch('/api/auth/complete-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Adgangskoden kunne ikke nulstilles.');
      success.textContent = 'Adgangskoden er nulstillet. Du kan nu logge ind.';
      $('#loginPassword').value = '';
      history.replaceState({}, '', location.pathname + location.hash);
      setTimeout(() => {
        $('#passwordResetDialog')?.close();
        openAuthDialog('login');
      }, 900);
    } catch (resetFailure) {
      error.textContent = resetFailure.message;
    }
  });
  $('#continueGuest')?.addEventListener('click', () => {
    localStorage.removeItem('noteit-session');
    localStorage.removeItem('noteit-guest');
    sessionStorage.setItem('noted-guest', 'yes');
    appSettings = { ...appSettings, country: 'DK', interfaceLanguage: 'da', defaultLanguage: 'da', autoCorrect: false };
    startGuestDemo();
    $('#welcomeDialog')?.close();
    location.hash = '#/app';
    route();
    startupGuideQueued = false;
    scheduleStartupGuide({ force: true, delay: 950 });
  });
  $('#guestSaveNotice')?.addEventListener('click', e => {
    const auth = e.target.closest('[data-guest-auth]');
    if (!auth) return;
    $('#guestSaveNotice').classList.remove('visible');
    localStorage.removeItem('noteit-guest');
    sessionStorage.removeItem('noted-guest');
    location.hash = '';
    route();
    openAuthDialog(auth.dataset.guestAuth);
  });
  $('#profileStatus')?.addEventListener('click', e => {
    if (!e.target.closest('#upgradeGuest')) return;
    localStorage.removeItem('noteit-guest');
    sessionStorage.removeItem('noted-guest');
    location.hash = '';
    route();
    openAuthDialog('signup');
  });
  $('#openGroups')?.addEventListener('click', () => {
    activeGroupId = activeGroupId && data.groups.some(group => group.id === activeGroupId) ? activeGroupId : data.groups[0]?.id || null;
    activeGroupTool = null;
    setGroupDialogMode(false);
    renderGroupList();
    if (activeGroupId) renderGroupWorkspace(activeGroupId);
    else $('#groupWorkspace').innerHTML = '<div class="empty-list">Opret din første studiegruppe.</div>';
    $('#groupDialog').showModal();
  });
  const startNewGroup = () => {
    activeGroupTool = null;
    setGroupDialogMode(false);
    $('#groupWorkspace').innerHTML = `<form id="newGroupForm" class="new-group-form">
      <div class="group-form-visual"><span></span><span></span><span></span><b>Ny studiegruppe</b><small>Saml gruppen og vælg arbejdsform bagefter</small></div>
      <div class="field"><label>Gruppens navn</label><input id="newGroupName" required placeholder="Fx Projektgruppe 4"></div>
      <div class="field"><label>Deltagere</label><textarea id="newGroupMembers" placeholder="Skriv navne eller emails, adskilt med komma">${escapeHtml(getSession()?.name || '')}</textarea><small>Du kan altid tilføje flere senere.</small></div>
      <div class="group-start-options"><span>Fælles noter</span><span>Brainstorm</span><span>Quizzer</span><span>Opgaver</span><span>Kilder</span><span>Feedback</span></div>
      <button type="submit" class="btn-primary">Start gruppearbejde</button>
    </form>`;
    renderGroupList();
    if (!$('#groupDialog').open) $('#groupDialog').showModal();
  };
  $('#newGroup')?.addEventListener('click', startNewGroup);
  $('#startGroupWork')?.addEventListener('click', startNewGroup);
  $('#premiumDialog')?.addEventListener('click', e => {
    const plan = e.target.closest('[data-activate-premium]')?.dataset.activatePremium;
    if (plan) activatePremium(plan);
  });
  $('#redeemPremiumCode')?.addEventListener('click', () => redeemAccessCode($('#premiumCode')?.value));
  $('#exitNoteExamMode')?.addEventListener('click', () => $('#noteExamModeDialog')?.close());
  $('#revealNoteExamCard')?.addEventListener('click', () => {
    noteExamState.revealed = !noteExamState.revealed;
    renderNoteExamCard();
  });
  $('#previousNoteExamCard')?.addEventListener('click', () => {
    if (noteExamState.index <= 0) return;
    noteExamState.index -= 1;
    noteExamState.revealed = false;
    renderNoteExamCard();
  });
  $('#nextNoteExamCard')?.addEventListener('click', () => {
    if (noteExamState.index >= noteExamState.cards.length - 1) return;
    noteExamState.index += 1;
    noteExamState.revealed = false;
    renderNoteExamCard();
  });
  $('#goToFullExamTraining')?.addEventListener('click', () => {
    $('#noteExamModeDialog')?.close();
    $('#openExamPrep')?.click();
  });
  $('#groupList')?.addEventListener('click', e => {
    const button = e.target.closest('[data-open-group]');
    if (button) renderGroupWorkspace(button.dataset.openGroup);
  });
  $('#groupDialog')?.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'newGroupForm') {
      const name = $('#newGroupName').value.trim();
      if (!name) return;
      const members = $('#newGroupMembers').value.split(',').map(value => value.trim()).filter(Boolean).slice(0, 20);
      const group = {
        id: uid(), name, members, notes: '', cards: [], quiz: [], roles: {}, sources: [], decisions: [], feedback: '', files: [],
        workspaces: { board: [], meetings: [], tasks: [], roleList: [], feedbackList: [] },
      };
      data.groups.push(group);
      persist();
      renderGroupWorkspace(group.id);
      return;
    }
    const tool = e.target.dataset.groupForm;
    const group = data.groups.find(item => item.id === activeGroupId);
    if (!tool || !group) return;
    const record = { id: uid(), ...formRecord(e.target) };
    if (tool === 'board') group.workspaces.board.push({ author: getSession()?.name || 'Deltager', ...record });
    else if (tool === 'brainstorm') group.cards.push(record);
    else if (tool === 'quiz') group.quiz.push(record);
    else if (tool === 'roles') group.workspaces.roleList.push(record);
    else if (tool === 'meeting') group.workspaces.meetings.push(record);
    else if (tool === 'tasks') group.workspaces.tasks.push(record);
    else if (tool === 'sources') group.sources.push(record);
    else if (tool === 'decisions') group.decisions.push(record);
    else if (tool === 'feedback') group.workspaces.feedbackList.push(record);
    persist();
    renderGroupWorkspace(group.id, tool);
  });
  $('#groupDialog')?.addEventListener('input', e => {
    if (!e.target.dataset.groupLive || !activeGroupId) return;
    const group = data.groups.find(item => item.id === activeGroupId);
    group[e.target.dataset.groupLive] = e.target.value;
    persist();
  });
  $('#groupDialog')?.addEventListener('click', async e => {
    const hub = e.target.closest('[data-group-hub]');
    if (hub) {
      const action = hub.dataset.groupHub;
      if (action === 'new') { startNewGroup(); return; }
      const group = data.groups.find(item => item.id === activeGroupId) || data.groups[0];
      if (!group) {
        showHubMessage('#groupWorkspace', hub.querySelector('b').textContent, 'Start først en studiegruppe. Derefter åbner funktionen direkte i gruppens arbejdsrum.', ['Opret gruppe', 'Tilføj deltagere', 'Begynd sammen']);
        return;
      }
      renderGroupWorkspace(group.id, action);
      return;
    }
    const toolButton = e.target.closest('[data-open-group-tool]');
    if (toolButton && activeGroupId) {
      renderGroupWorkspace(activeGroupId, toolButton.dataset.openGroupTool);
      return;
    }
    if (e.target.closest('[data-group-back]')) {
      renderGroupWorkspace(activeGroupId);
      return;
    }
    if (e.target.closest('[data-ai-group-quiz]')) {
      const group = data.groups.find(item => item.id === activeGroupId);
      if (!group) return;
      const wsBody = document.querySelector('#groupWorkspace .immersive-body');
      if (wsBody) showAiLoading(wsBody, 'Genererer quizspørgsmål til gruppen…');
      const context = [
        group.name,
        ...group.quiz.map(q => q.question || q).slice(0, 5),
        ...(group.notes ? [group.notes.slice(0, 400)] : []),
      ].filter(Boolean).join(', ');
      requestOpenAI({
        instructions: 'Du er studiecoach. Generér 6 faglige quizspørgsmål med korte præcise svar. Format per spørgsmål:\nQ: [spørgsmål]\nA: [kort svar]',
        input: `Studiegruppe: ${context}`,
      }).then(text => {
        const lines = text.split('\n');
        const pairs = [];
        let cur = null;
        lines.forEach(l => {
          if (l.startsWith('Q:')) cur = { question: l.slice(2).trim(), answer: '' };
          else if (l.startsWith('A:') && cur) { cur.answer = l.slice(2).trim(); pairs.push({ id: uid(), ...cur }); cur = null; }
        });
        pairs.forEach(p => group.quiz.push(p));
        persist(); renderGroupWorkspace(group.id, 'quiz');
      }).catch(() => renderGroupWorkspace(group.id, 'quiz'));
      return;
    }
    if (e.target.closest('[data-collect-group-ideas]')) {
      const group = data.groups.find(item => item.id === activeGroupId);
      if (!group?.cards?.length) return;
      const wsBody = document.querySelector('#groupWorkspace .immersive-body');
      if (wsBody) showAiLoading(wsBody, 'Opsummerer idéerne…');
      const ideas = group.cards.map((c, i) => `${i + 1}. ${c.text} (${c.author || 'Deltager'})`).join('\n');
      requestOpenAI({
        instructions: 'Du er gruppefacilitator. Analysér denne brainstorm fra en studiegruppe. Identificér 3-5 temaer, opsummér idéerne konstruktivt og inspirerende på dansk og foreslå næste skridt.',
        input: `Gruppe: ${group.name}\n\nIdéer:\n${ideas}`,
      }).then(summary => {
        group.summary = summary;
        persist(); renderGroupWorkspace(group.id, 'brainstorm');
      }).catch(() => {
        group.summary = groupedIdeaSummary(group.cards);
        persist(); renderGroupWorkspace(group.id, 'brainstorm');
      });
      return;
    }
    const deleteButton = e.target.closest('[data-group-delete]');
    if (deleteButton) {
      const group = data.groups.find(item => item.id === activeGroupId);
      const tool = deleteButton.dataset.groupDelete;
      const records = tool === 'board' ? group.workspaces.board
        : tool === 'brainstorm' ? group.cards
          : tool === 'quiz' ? group.quiz
            : tool === 'roles' ? group.workspaces.roleList
              : tool === 'meeting' ? group.workspaces.meetings
                : tool === 'tasks' ? group.workspaces.tasks
                  : tool === 'sources' ? group.sources
                    : tool === 'decisions' ? group.decisions
                      : tool === 'feedback' ? group.workspaces.feedbackList
                        : group.files;
      removeWorkspaceRecord(records, deleteButton.dataset.recordId);
      persist(); renderGroupWorkspace(group.id, activeGroupTool);
      return;
    }
    const button = e.target.closest('[data-copy-group]');
    if (button) {
      await navigator.clipboard.writeText(`NOTED-GROUP-${button.dataset.copyGroup}`);
      alert('Invitationskoden er kopieret.');
      return;
    }
    const addMember = e.target.closest('[data-group-add-member]');
    if (addMember) {
      const group = data.groups.find(item => item.id === addMember.dataset.groupAddMember);
      const name = prompt('Navn eller email:');
      if (name?.trim()) { group.members.push(name.trim()); persist(); renderGroupList(); renderGroupWorkspace(group.id); }
      return;
    }
  });
  $('#groupDialog')?.addEventListener('change', e => {
    const input = e.target.closest('[data-group-workspace-file]');
    if (!input) return;
    const group = data.groups.find(item => item.id === activeGroupId);
    group.files ||= [];
    group.files.push(...Array.from(input.files || []).map(file => ({ name: file.name, size: file.size, type: file.type })));
    persist();
    renderGroupWorkspace(group.id, 'files');
  });
  $('#examPrepDialog')?.addEventListener('close', () => closeExamActivity());
  $('#examDialog')?.addEventListener('close', () => closeExamPlanSubject());
  $('#openExamPrep')?.addEventListener('click', () => {
    closeExamActivity();
    const extraMode = document.querySelector('input[name="examTrainingMode"][value="subject"]');
    const extraModeLabel = extraMode?.closest('label')?.querySelector('span');
    if (extraModeLabel) extraModeLabel.textContent = 'Nye spørgsmål uden for pensum';
    renderExamPrepSubjects();
    renderExamPrepFolders();
    renderRewardStrip();
    if ($('#drawnExamTopic')) $('#drawnExamTopic').value = examData.drawnTopic || '';
    if ($('#drawnTopicNotesResult')) $('#drawnTopicNotesResult').innerHTML = '';
    ensureExamSelfNotes();
    renderExamPrepPaperOverview();
    $('#examPrepDialog').showModal();
  });
  $('#findDrawnTopicNotes')?.addEventListener('click', findNotesForDrawnTopic);
  $('#drawnExamTopic')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      findNotesForDrawnTopic();
    }
  });
  $('#drawnTopicNotesResult')?.addEventListener('click', event => {
    const button = event.target.closest('[data-open-drawn-note]');
    if (!button) return;
    $('#examPrepDialog')?.close();
    selectPage(button.dataset.openDrawnNote);
  });
  $('#generateExamPrep')?.addEventListener('click', generateExamPreparation);
  $('#examPrepDialog')?.addEventListener('click', e => {
    if (e.target.closest('[data-go-exam-plan]')) {
      $('#examPrepDialog').close();
      openExamDialog();
      return;
    }
    const trainingModeButton = e.target.closest('[data-paper-training-mode]');
    if (trainingModeButton) {
      setPaperTrainingMode(trainingModeButton.dataset.paperTrainingMode);
      if (selectedExamActivity && selectedExamActivityTab === 'pick-subject') {
        renderExamActivityWorkspace();
      } else {
        renderExamPrepPaperOverview();
      }
      return;
    }
    if (e.target.closest('[data-exam-activity-back]')) {
      if (selectedExamActivityTab === 'page' && selectedExamActivity) {
        selectedExamActivityTab = 'pick-subject';
        paperTrainingState = null;
        activeExamQuiz = null;
        renderExamActivityWorkspace();
      } else {
        closeExamActivity();
      }
      return;
    }
    const activityTab = e.target.closest('[data-exam-activity-tab]');
    if (activityTab && selectedExamActivity) {
      selectedExamActivityTab = activityTab.dataset.examActivityTab;
      renderExamActivityWorkspace();
      return;
    }
    const tabJump = e.target.closest('[data-exam-activity-tab-jump]');
    if (tabJump && selectedExamActivity) {
      selectedExamActivityTab = tabJump.dataset.examActivityTabJump;
      renderExamActivityWorkspace();
      return;
    }
    const guide = e.target.closest('[data-exam-guide]');
    if (guide) {
      openExamActivity(guide.dataset.examGuide, guide.dataset.examGuide === 'synopsis' ? 'overview' : 'guide');
      return;
    }
    if (e.target.closest('[data-pick-paper-subject]')) {
      setSelectedPaperTrainingSubject(e.target.closest('[data-pick-paper-subject]').dataset.pickPaperSubject);
      renderExamPrepPaperOverview();
      return;
    }
    const preset = e.target.closest('[data-training-preset]');
    if (preset) {
      paperTrainingState = null;
      activeExamQuiz = null;
      const subjectId = preset.dataset.paperSubjectId || selectedPaperTrainingSubjectId;
      if (!subjectId) {
        openExamActivity(preset.dataset.trainingPreset, 'pick-subject');
        return;
      }
      if (!requireExamTrainingPremium()) return;
      setSelectedPaperTrainingSubject(subjectId);
      generatePaperTraining(preset.dataset.trainingPreset, subjectId, paperTrainingModeValue());
      return;
    }
    const generatePaper = e.target.closest('[data-generate-paper-training]');
    if (generatePaper) {
      if (!requireExamTrainingPremium()) return;
      const subjectId = document.querySelector('input[name="paperTrainingSubject"]:checked')?.value;
      if (!subjectId) return alert('Vælg et fag at træne i.');
      setSelectedPaperTrainingSubject(subjectId);
      generatePaperTraining(generatePaper.dataset.generatePaperTraining, subjectId, paperTrainingModeValue());
      return;
    }
    if (e.target.closest('[data-start-paper-quiz]') && paperTrainingState?.quiz?.questions?.length) {
      if (!requireExamTrainingPremium()) return;
      selectedExamActivityTab = 'page';
      activeExamQuiz = {
        questions: paperTrainingState.quiz.questions,
        index: 0,
        correct: 0,
        scores: [],
        answered: new Set(),
        subjectIds: [paperTrainingState.subjectId],
        mode: paperTrainingState.quiz.mode || 'written',
        flipped: false,
        setName: `${paperTrainingState.subject.name} · ${paperTrainingLabels[paperTrainingState.preset]}`,
        sourceMode: paperTrainingState.sourceMode,
        sourceLabel: paperTrainingState.sourceLabel,
        selectedAnswer: '',
      };
      renderExamActivityWorkspace();
      return;
    }
    const pensumSubject = e.target.closest('[data-open-pensum-subject]');
    if (pensumSubject && selectedExamActivity === 'curriculum') {
      openExamPlanSubject(pensumSubject.dataset.openPensumSubject, 'plan');
      return;
    }
    if (e.target.closest('[data-generate-synopsis-guide]')) {
      generateExamGuide('synopsis');
      return;
    }
    const guideBtn = e.target.closest('[data-generate-exam-guide]');
    if (guideBtn) {
      generateExamGuide(guideBtn.dataset.generateExamGuide);
      return;
    }
    const trainingBtn = e.target.closest('[data-start-training]');
    if (trainingBtn) {
      startExamActivityTraining(trainingBtn.dataset.startTraining);
      return;
    }
    if (e.target.closest('[data-board-clear]')) {
      const canvas = document.getElementById('paperBlackboardCanvas');
      canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (e.target.closest('[data-board-clean]')) {
      const out = document.getElementById('cleanBoardText');
      const points = paperTrainingState?.data?.keyPoints || [];
      if (out) {
        out.textContent = paperTrainingState?.data?.prompt
          || 'Forklaring: start med begrebet, giv en kort definition, forklar sammenhængen, og slut med et eksempel fra dine noter.';
      }
      if (points.length && out?.nextElementSibling?.matches('.paper-key-points')) {
        out.nextElementSibling.innerHTML = points.map(point => `<li>${escapeHtml(point)}</li>`).join('');
      }
      return;
    }
    const quizAnswer = e.target.closest('[data-paper-quiz-answer]');
    if (quizAnswer) {
      document.querySelectorAll('[data-paper-quiz-answer]').forEach(btn => btn.classList.toggle('selected', btn === quizAnswer));
      return;
    }
    if (e.target.closest('[data-paper-next-card]')) {
      const question = document.querySelector('.flash-question');
      if (question) question.textContent = 'Forklar begrebet med egne ord og giv et eksempel.';
      return;
    }
    if (e.target.closest('[data-start-flashcard-training]') || e.target.closest('[data-start-repeat-training]')) {
      selectedExamPreset = 'flashcards';
      startExamActivityTraining('flashcards');
      return;
    }
    if (e.target.closest('[data-create-flashcards-from-notes]')) {
      createFlashcardsFromSelectedNotes();
      return;
    }
    const setBtn = e.target.closest('[data-start-flashcard-set]');
    if (setBtn) {
      const set = getFlashcardSets().find(item => item.id === setBtn.dataset.startFlashcardSet);
      if (!set) return;
      const subject = examData.subjects.find(item => item.id === set.subjectId);
      if (!subject) return;
      selectedExamPreset = 'flashcards';
      activeExamQuiz = {
        questions: set.cards.map(card => ({
          id: uid(), type: 'written', subject: set.name, prompt: card.front, answer: card.back,
          explanation: card.back,
        })),
        index: 0, correct: 0, scores: [], answered: new Set(), subjectIds: [subject.id], mode: 'flashcards',
        setName: set.name, flipped: false,
      };
      set.lastStudied = new Date().toISOString();
      saveExamData();
      selectedExamActivityTab = 'train';
      renderExamActivityWorkspace();
      renderExamQuiz();
      return;
    }
    if (e.target.closest('[data-trigger-flashcard-pdf]')) {
      document.querySelector('[data-exam-flashcard-pdf]')?.click();
      return;
    }
    if (e.target.closest('#findDrawnTopicNotesActivity')) {
      const input = $('#drawnExamTopicActivity');
      if (input) $('#drawnExamTopic').value = input.value;
      findNotesForDrawnTopic();
      const result = $('#drawnTopicNotesResult')?.innerHTML || '';
      const activityResult = $('#drawnTopicNotesResultActivity');
      if (activityResult) activityResult.innerHTML = result;
      return;
    }
  });
  $('#examPrepDialog')?.addEventListener('change', async e => {
    if (e.target.name === 'paperTrainingSubject') {
      setSelectedPaperTrainingSubject(e.target.value);
      document.querySelectorAll('.paper-subject-pick').forEach(label => {
        label.classList.toggle('selected', label.querySelector('input')?.checked);
      });
      return;
    }
    const synopsisPdf = e.target.closest('[data-exam-synopsis-pdf]');
    if (synopsisPdf?.files?.length) {
      const file = synopsisPdf.files[0];
      if (file.size > 50 * 1024 * 1024) return alert('PDF-filen må højst fylde 50 MB.');
      const drop = synopsisPdf.closest('.exam-material-drop');
      if (drop) drop.querySelector('small').textContent = 'Indlæser PDF…';
      try {
        const lit = await extractLiteraturePdf(file);
        examData.synopsisPdf = { name: lit.name, text: lit.text, pageCount: lit.pageCount };
        saveExamData();
        if (drop) drop.querySelector('small').textContent = `Klar: ${lit.name} (${lit.pageCount} sider)`;
        if (selectedExamActivity === 'synopsis') renderExamActivityWorkspace();
      } catch (err) {
        if (drop) drop.querySelector('small').textContent = 'Kunne ikke læse PDF – prøv igen';
        alert('Fejl ved PDF-indlæsning: ' + err.message);
      }
      return;
    }
    const pdfInput = e.target.closest('[data-exam-flashcard-pdf]');
    if (!pdfInput?.files?.length) return;
    const file = pdfInput.files[0];
    if (file.size > 50 * 1024 * 1024) return alert('PDF-filen må højst fylde 50 MB.');
    try {
      const lit = await extractLiteraturePdf(file);
      examData.pendingFlashcardPdf = { name: lit.name, text: lit.text, pageCount: lit.pageCount };
      saveExamData();
      alert(`"${file.name}" er klar (${lit.pageCount} sider). Vælg noter eller start oprettelse af flashcards.`);
    } catch (err) {
      alert('Fejl ved PDF-indlæsning: ' + err.message);
    }
  });
  $('#examPrepDialog')?.addEventListener('input', e => {
    const draftField = e.target.closest('[data-synopsis-draft] [name]');
    if (draftField) {
      ensureExamDataShape();
      examData.synopsisDrafts.default[draftField.name] = draftField.value;
      saveExamData();
    }
  });
  $('#examPrepDialog')?.addEventListener('click', event => {
    if (event.target.closest('[data-toggle-exam-notes]')) {
      $('#examSelfNotes')?.classList.toggle('collapsed');
      return;
    }
    if (event.target.closest('[data-add-exam-note]')) {
      examData.selfNotes ||= [];
      examData.selfNotes.push({ id: uid(), text: '' });
      saveExamData();
      renderExamSelfNotes();
      $('#examSelfNotes')?.classList.remove('collapsed');
      return;
    }
    const remove = event.target.closest('[data-delete-exam-note]');
    if (remove) {
      examData.selfNotes = (examData.selfNotes || []).filter(note => note.id !== remove.dataset.deleteExamNote);
      saveExamData();
      renderExamSelfNotes();
    }
  });
  $('#examPrepDialog')?.addEventListener('input', event => {
    const textarea = event.target.closest('[data-exam-note]');
    if (!textarea) return;
    const note = (examData.selfNotes || []).find(item => item.id === textarea.dataset.examNote);
    if (!note) return;
    note.text = textarea.value;
    saveExamData();
  });
  $('#rewardStrip')?.addEventListener('click', e => { if (e.target.closest('[data-open-rewards]')) openRewardsPanel(); });
  $('#examPrepDialog')?.addEventListener('click', async e => {
    if (!e.target.closest('#examPrepResult, #examActivityQuiz, .exam-activity-quiz')) return;
    if (e.target.closest('[data-go-exam-plan]')) {
      $('#examPrepDialog').close();
      openExamDialog();
      return;
    }
    if (e.target.closest('[data-restart-quiz]')) { generateExamPreparation(); return; }
    if (e.target.closest('[data-copy-exam-guide]')) {
      const copy = (getExamQuizHost().querySelector('.exam-guide-copy') || $('#examPrepResult .exam-guide-copy'))?.innerText || '';
      if (copy) await navigator.clipboard.writeText(copy);
      e.target.closest('[data-copy-exam-guide]').textContent = 'Kopieret';
      return;
    }
    if (!activeExamQuiz) return;
    const question = activeExamQuiz.questions[activeExamQuiz.index];
    if (!question && !e.target.closest('[data-restart-quiz]')) return;

    if (e.target.closest('[data-quiz-leave]')) {
      activeExamQuiz = null;
      const host = getExamQuizHost();
      if (host) host.innerHTML = '';
      return;
    }
    if (e.target.closest('[data-flip-card]') || e.target.closest('[data-show-answer]')) {
      activeExamQuiz.flipped = true;
      renderExamQuiz();
      return;
    }
    if (e.target.closest('[data-confidence]')) {
      const level = Number(e.target.closest('[data-confidence]').dataset.confidence);
      if (!activeExamQuiz.answered.has(question.id)) {
        activeExamQuiz.answered.add(question.id);
        if (level >= 3) { activeExamQuiz.correct += 1; activeExamQuiz.scores.push(level >= 4 ? 10 : 7); }
        else activeExamQuiz.scores.push(level);
      }
      activeExamQuiz.flipped = false;
      activeExamQuiz.index += 1;
      const total = activeExamQuiz.questions.length;
      const progress = Math.round((activeExamQuiz.index / total) * 100);
      const set = getFlashcardSets().find(s => s.name === activeExamQuiz.setName);
      if (set) { set.progress = progress; set.lastStudied = new Date().toISOString(); saveExamData(); }
      renderExamQuiz();
      return;
    }
    if (e.target.closest('[data-quiz-prev]') && activeExamQuiz.index > 0) {
      activeExamQuiz.index -= 1;
      activeExamQuiz.flipped = false;
      renderExamQuiz();
      return;
    }
    if (e.target.closest('[data-quiz-next]') && activeExamQuiz.flipped) {
      activeExamQuiz.flipped = false;
      activeExamQuiz.index += 1;
      renderExamQuiz();
      return;
    }
    if (e.target.closest('[data-quiz-next-card]') && activeExamQuiz.selectedAnswer) {
      const correct = activeExamQuiz.selectedAnswer === question.answer;
      if (!activeExamQuiz.answered.has(question.id)) {
        activeExamQuiz.answered.add(question.id);
        if (correct) { activeExamQuiz.correct += 1; activeExamQuiz.scores.push(10); }
        else activeExamQuiz.scores.push(1);
      }
      activeExamQuiz.selectedAnswer = '';
      activeExamQuiz.index += 1;
      renderExamQuiz();
      return;
    }

    const feedback = $('#quizFeedback');
    if (e.target.closest('[data-quiz-unknown]')) {
      if (feedback) {
        feedback.className = 'quiz-feedback visible info';
        feedback.innerHTML = `<b>Forklaring</b><p>${escapeHtml(question.explanation)}</p><button type="button" class="btn-outline" data-quiz-retry>Prøv igen</button>`;
      }
      return;
    }
    if (e.target.closest('[data-quiz-retry]')) { renderExamQuiz(); return; }
    let correct = false;
    const answerButton = e.target.closest('[data-quiz-answer]');
    let score = 0;
    if (answerButton && question.type === 'choice') {
      activeExamQuiz.selectedAnswer = answerButton.dataset.quizAnswer;
      renderExamQuiz();
      return;
    }
    if (answerButton) {
      correct = answerButton.dataset.quizAnswer === question.answer;
      score = correct ? 10 : 1;
    }
    if (e.target.closest('[data-submit-written]')) {
      const written = $('#writtenExamAnswer')?.value.trim() || '';
      const words = written.split(/\s+/).filter(Boolean).length;
      if (words < 8) {
        feedback.className = 'quiz-feedback visible info';
        feedback.innerHTML = '<b>Uddyb lidt mere</b><p>Tilføj en definition, en faglig sammenhæng og et eksempel.</p>';
        return;
      }
      const submit = e.target.closest('[data-submit-written]');
      submit.disabled = true;
      submit.textContent = 'Vurderer svaret…';
      try {
        const assessment = await requestOpenAI({
          instructions: 'Du er en fair universitetsunderviser. Vurder svaret mod spørgsmålet og det medfølgende kildemateriale. Giv ikke en eksamenskarakter. Returnér præcis dette format:\nSCORE: [heltal 1-10]\nSTYRKER: [kort konkret tekst]\nMANGLER: [kort konkret tekst]\nFORBEDRET: [et bedre eksempel på svar]. Vær tydelig om usikkerhed, og opfind ikke fakta uden for materialet.',
          input: `SPØRGSMÅL:\n${question.prompt}\n\nKILDE ELLER HINT:\n${question.answer || question.explanation}\n\nDEN STUDERENDES SVAR:\n${written}`,
        });
        score = Math.max(1, Math.min(10, Number(assessment.match(/SCORE:\s*(\d+)/i)?.[1]) || 1));
        question.currentFeedback = assessment.replace(/SCORE:\s*\d+/i, '').trim();
      } catch {
        const hasExample = /for eksempel|fx|eksempel/i.test(written);
        const hasReasoning = /fordi|derfor|betyder|sammenhæng|skyldes/i.test(written);
        const sourceTerms = String(question.answer || '').toLocaleLowerCase('da').split(/\W+/).filter(word => word.length > 5);
        const usedTerms = sourceTerms.filter(term => written.toLocaleLowerCase('da').includes(term)).length;
        score = Math.min(10, 2 + Math.floor(words / 12) + (hasExample ? 2 : 0) + (hasReasoning ? 2 : 0) + Math.min(2, usedTerms));
        question.currentFeedback = 'Styrke: Du har formuleret et selvstændigt svar.\nMangler: Brug flere præcise fagbegreber fra materialet, forklar sammenhængen tydeligere, og tilføj et konkret eksempel.\nForbedret struktur: definition, forklaring, anvendelse og kort konklusion.';
      } finally {
        submit.disabled = false;
        submit.textContent = 'Svar';
      }
      correct = score >= 5;
    }
    if (!answerButton && !e.target.closest('[data-submit-written]')) {
      if (e.target.closest('[data-quiz-next]')) { activeExamQuiz.index += 1; renderExamQuiz(); }
      return;
    }
    if (correct) {
      if (!activeExamQuiz.answered.has(question.id)) {
        activeExamQuiz.answered.add(question.id);
        activeExamQuiz.correct += 1;
        activeExamQuiz.scores.push(score);
      }
      feedback.className = 'quiz-feedback visible correct';
      feedback.innerHTML = `<b>${question.type === 'written' ? `${score}/10` : 'Rigtigt'}</b><p>${escapeHtml(question.currentFeedback || question.explanation).replace(/\n/g, '<br>')}</p><button type="button" class="btn-primary" data-quiz-next>Næste</button>`;
    } else {
      feedback.className = 'quiz-feedback visible wrong';
      feedback.innerHTML = `<b>${question.type === 'written' ? `${score}/10 · uddyb svaret` : 'Ikke helt endnu'}</b><p>${escapeHtml(question.currentFeedback || question.explanation).replace(/\n/g, '<br>')}</p><button type="button" class="btn-outline" data-quiz-retry>Prøv igen</button>`;
    }
  });
  $('#newExamFolder')?.addEventListener('click', () => {
    const name = prompt('Navn på eksamensmappen:');
    if (!name?.trim()) return;
    examData.folders.push({ id: uid(), name: name.trim(), subjectIds: [] });
    saveExamData(); renderExamPrepFolders();
  });
  $('#saveExamFolder')?.addEventListener('click', () => {
    const ids = [...document.querySelectorAll('#examPrepSubjects input:checked')].map(input => input.value);
    if (!ids.length) return alert('Vælg mindst ét fag.');
    let folder = examData.folders[examData.folders.length - 1];
    if (!folder) {
      const name = prompt('Navn på eksamensmappen:');
      if (!name?.trim()) return;
      folder = { id: uid(), name: name.trim(), subjectIds: [] };
      examData.folders.push(folder);
    }
    folder.subjectIds = ids;
    saveExamData(); renderExamPrepFolders();
  });
  $('#examPrepFolders')?.addEventListener('click', e => {
    const button = e.target.closest('[data-exam-folder]');
    if (!button) return;
    const folder = examData.folders.find(item => item.id === button.dataset.examFolder);
    document.querySelectorAll('#examPrepSubjects input').forEach(input => { input.checked = folder?.subjectIds.includes(input.value); });
  });

  function openExamSubjectForm() {
    $('#examSubjectForm').reset();
    pendingExamFiles = [];
    $('#examFileList').innerHTML = '';
    $('#examNotebookSubject').innerHTML = '<option value="">Vælg fag...</option>' + data.subjects.map(subject => `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join('');
    $('#examSubjectDialog').showModal();
  }
  $('#addExamSubject')?.addEventListener('click', openExamSubjectForm);
  async function processLiteratureFiles(files) {
    const list = $('#examFileList');
    if (!files.length) { pendingExamFiles = []; list.innerHTML = ''; return; }
    if (files.some(f => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'))) {
      pendingExamFiles = []; list.innerHTML = '';
      return alert('Kun PDF-filer kan bruges som litteratur.');
    }
    if (files.length > 5) {
      pendingExamFiles = []; list.innerHTML = '';
      return alert('Du kan højst uploade 5 PDF-filer pr. fag.');
    }
    list.innerHTML = '<span class="lit-extracting">Indlæser og analyserer PDF-tekst…</span>';
    pendingExamFiles = [];
    try {
      for (const file of files) {
        const lit = await extractLiteraturePdf(file);
        pendingExamFiles.push(lit);
      }
      list.innerHTML = pendingExamFiles.map(f =>
        `<span class="lit-chip"><b>${escapeHtml(f.name)}</b><small>${f.pageCount} sider · klar til eksamenstræning</small></span>`
      ).join('');
    } catch (err) {
      pendingExamFiles = []; list.innerHTML = '';
      alert('Fejl ved PDF-indlæsning: ' + err.message);
    }
  }
  $('#examFiles')?.addEventListener('change', async e => {
    await processLiteratureFiles([...e.target.files]);
  });
  const litDrop = $('#examLitDrop');
  if (litDrop) {
    litDrop.addEventListener('dragover', e => { e.preventDefault(); litDrop.classList.add('drag-over'); });
    litDrop.addEventListener('dragleave', () => litDrop.classList.remove('drag-over'));
    litDrop.addEventListener('drop', async e => {
      e.preventDefault(); litDrop.classList.remove('drag-over');
      const files = [...e.dataTransfer.files].filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
      if (!files.length) return alert('Træk kun PDF-filer hertil.');
      await processLiteratureFiles(files);
    });
  }
  $('#examSubjectForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const subjectId = $('#examNotebookSubject').value;
    const subject = data.subjects.find(item => item.id === subjectId);
    if (!subject) return alert('Vælg et fag fra dine notesbøger.');
    const date = $('#examDate').value;
    if (!date) return alert('Vælg en eksamensdato.');
    const source = document.querySelector('input[name="curriculumSource"]:checked')?.value || 'notes';
    if ((source === 'files' || source === 'both') && !pendingExamFiles.length) return alert('Upload mindst én PDF-fil med pensum eller litteratur.');
    const noteTopics = data.pages.filter(page => page.subjectId === subjectId).map(page => page.title).filter(Boolean);
    const fileTopics = pendingExamFiles.map(file => file.name.replace(/\.pdf$/i, ''));
    const topics = source === 'notes' ? noteTopics : source === 'files' ? fileTopics : [...new Set([...noteTopics, ...fileTopics])];
    const questions = $('#autoExamQuestions').checked
      ? topics.slice(0, 8).map(topic => `Forklar ${topic}, og giv et relevant fagligt eksempel.`)
      : [];
    examData.subjects.push({
      id: uid(), subjectId, name: subject.name, date, reexamDate: $('#reexamDate').value,
      source,
      files: pendingExamFiles.map(f => ({ name: f.name, pageCount: f.pageCount })),
      literature: pendingExamFiles.map(f => ({ id: uid(), name: f.name, text: f.text, pageCount: f.pageCount })),
      topics, questions,
    });
    pendingExamFiles = [];
    saveExamData();
    $('#examSubjectDialog').close();
    renderExamSubjects();
    renderExamSidebar();
    generateExamPlan();
  });
  $('#examSubjects')?.addEventListener('click', e => {
    if (e.target.closest('[data-add-exam-subject]')) {
      openExamSubjectForm();
      return;
    }
    const rm = e.target.closest('[data-remove-exam]');
    if (!rm) return;
    removeExamSubjectFromPlan(rm.dataset.removeExam);
  });
  $('#generatePlan')?.addEventListener('click', generateExamPlan);
  $('#examDialog')?.addEventListener('click', e => {
    const deleteSubjectBtn = e.target.closest('[data-delete-exam-subject]');
    if (deleteSubjectBtn) {
      removeExamSubjectFromPlan(deleteSubjectBtn.dataset.deleteExamSubject);
      return;
    }
    if (e.target.closest('[data-open-exam-prep-from-plan]')) {
      $('#examDialog')?.close();
      $('#openExamPrep')?.click();
      return;
    }
    if (e.target.closest('#resetExamProgressDash')) {
      if (!Object.keys(examData.checks || {}).length) return;
      if (!confirm('Nulstil alle afkrydsninger i din eksamensplan?')) return;
      examData.checks = {};
      saveExamData();
      renderExamPlan();
      renderExamSidebar();
      return;
    }
    if (e.target.closest('#exportExamPlanDash')) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(examData, null, 2)], { type: 'application/json' }));
      a.download = 'stemnotes-eksamensplan.json';
      a.click();
      return;
    }
    if (e.target.closest('[data-exam-plan-show-builder]')) {
      showExamPlanBuilder();
      return;
    }
    if (e.target.closest('#addExamSubjectDash')) {
      $('#addExamSubject')?.click();
      return;
    }
    if (e.target.closest('[data-exam-plan-back]')) {
      backToExamPlanOverview();
      return;
    }
    const subjectOpen = e.target.closest('[data-open-exam-subject]');
    if (subjectOpen) {
      openExamPlanSubject(subjectOpen.dataset.openExamSubject, 'plan');
      return;
    }
    const planTab = e.target.closest('[data-exam-activity-tab]');
    if (planTab?.dataset.examActivityTab === 'repeat-link') {
      $('#examDialog')?.close();
      openExamActivity('repeat', 'overview');
      return;
    }
    if (planTab && selectedExamPlanSubject) {
      selectedExamPlanTab = planTab.dataset.examActivityTab;
      renderExamPlanWorkspace();
      return;
    }
    const viewButton = e.target.closest('[data-exam-plan-view]');
    if (viewButton) {
      examData.view = viewButton.dataset.examPlanView;
      saveExamData();
      renderExamPlan();
      return;
    }
    const feature = e.target.closest('[data-exam-feature]');
    if (!feature) return;
    document.querySelectorAll('[data-exam-feature]').forEach(card => card.classList.toggle('active', card === feature));
    const messages = {
      priority: '<b>Prioritering aktiveret.</b> Planen fordeler først emner, der både er svære, centrale og tæt på eksamensdatoen.',
      buffer: '<b>Bufferdage aktiveret.</b> Søndage og hver syvende læsedag holdes fri til repetition eller forsinkelser.',
      oral: '<b>Mundtlig plan.</b> Tilføj disposition, 3 nøglebegreber, eksempel og kritisk refleksion til hvert emne.',
      status: `<b>Pensumdækning.</b> ${data.subjects.filter(subject => !data.pages.some(page => page.subjectId === subject.id)).length} fag mangler noter. ${data.pages.length} noter kan bruges i planen.`,
    };
    let info = $('#examFeatureInfo');
    if (!info) {
      info = document.createElement('div');
      info.id = 'examFeatureInfo';
      info.className = 'exam-feature-info';
      document.querySelector('.exam-plan-features')?.after(info);
    }
    info.innerHTML = messages[feature.dataset.examFeature];
  });
  $('#examPlan')?.addEventListener('change', e => {
    const cb = e.target.closest('[data-exam-check]');
    if (!cb) return;
    handleExamCheckToggle(cb);
    if (selectedExamPlanSubject) renderExamPlanWorkspace();
    if (examData.plan?.length) renderExamPlanDashboard();
  });
  $('#examPlanDashboard')?.addEventListener('change', e => {
    const cb = e.target.closest('[data-exam-check]');
    if (!cb) return;
    handleExamCheckToggle(cb);
    renderExamPlanDashboard();
  });
  $('#examPlanWorkspace')?.addEventListener('change', e => {
    const cb = e.target.closest('[data-exam-check]');
    if (!cb) return;
    handleExamCheckToggle(cb);
    renderExamPlanWorkspace();
  });
  $('#exportExamPlan')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(examData, null, 2)], { type: 'application/json' }));
    a.download = 'stemnotes-eksamensplan.json';
    a.click();
  });

  $('#plotGraph')?.addEventListener('click', plotFunction);
  $('#insertGraph')?.addEventListener('click', () => {
    const src = $('#graphCanvas').toDataURL('image/png');
    const expr = escapeHtml($('#graphExpression').value);
    $('#graphDialog').close();
    setTimeout(() => insertHtml(`<figure style="margin:16px 0"><img src="${src}" style="max-width:100%;border-radius:6px"><figcaption style="color:#6b7280;font-size:12px">f(x) = ${expr}</figcaption></figure><p><br></p>`), 50);
  });

  $('#onboardingStartGuide')?.addEventListener('click', () => {
    onboardingStep = 0;
    showOnboardingGuide();
  });
  $('#onboardingDismiss')?.addEventListener('click', finishOnboarding);
  $('#onboardingDismissGuide')?.addEventListener('click', finishOnboarding);
  $('#onboardingCloseGuide')?.addEventListener('click', finishOnboarding);
  $('#onboardingNext')?.addEventListener('click', () => {
    if (onboardingStep >= STARTUP_GUIDE_STEPS.length - 1) finishOnboarding();
    else setOnboardingStep(onboardingStep + 1);
  });
  $('#onboardingPrev')?.addEventListener('click', () => setOnboardingStep(onboardingStep - 1));
  $('#onboardingDialog')?.addEventListener('cancel', e => {
    e.preventDefault();
    finishOnboarding();
  });
  $('#onboardingIntro')?.addEventListener('click', e => {
    const card = e.target.closest('[data-chalk-preview]');
    if (!card) return;
    document.querySelectorAll('[data-chalk-preview]').forEach(el => el.classList.toggle('active', el === card));
    renderGuideIntroArt(card.dataset.chalkPreview);
  });
  $('#onboardingProgress')?.addEventListener('click', e => {
    const jump = e.target.closest('[data-guide-jump]');
    if (!jump) return;
    setOnboardingStep(Number(jump.dataset.guideJump));
  });
  $('#onboardingIllustration')?.addEventListener('click', () => {
    const illu = $('#onboardingIllustration');
    illu?.classList.remove('draw-play');
    void illu?.offsetWidth;
    illu?.classList.add('draw-play');
  });

  window.addEventListener('hashchange', route);
  if (location.protocol !== 'file:' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  syncDeviceCapabilities();
  localStorage.removeItem('noteit-guest');
  syncColorTheme(localStorage.getItem('noted-theme') || 'classic');
  const storedDarkMode = localStorage.getItem('noted-dark') ?? localStorage.getItem('noteit-dark');
  syncDarkMode(storedDarkMode === '1');
  bindEvents();
  renderExamPrepPaperOverview();
  initDrawing();
  const session = getSession();
  if (session) {
    if (session.guest) startGuestDemo();
    else loadAccountState(session);
    applyProfile(session);
    data.ui.view = 'notebook';
    data.ui.notebookIndex = Math.min(Number(data.ui.notebookIndex) || 0, Math.max(0, data.semesters.length - 1));
    location.hash = '#/app';
  } else {
    localStorage.removeItem('noteit-session');
    localStorage.removeItem('noteit-guest');
    if (location.hash.startsWith('#/app')) location.hash = '';
  }
  route();
  const resetToken = new URLSearchParams(location.search).get('token');
  if (resetToken) {
    $('#resetEmail')?.removeAttribute('required');
    $('#resetCompletionFields')?.classList.remove('hidden');
    $('#completePasswordReset')?.classList.remove('hidden');
    $('#sendResetEmail')?.classList.add('hidden');
    $('#passwordResetDialog')?.showModal();
  }
});

// . codex-test-noteit-01

// . codex-test-noteit-02

// . codex-test-noteit-03

// . codex-test-noteit-04

// . codex-test-noteit-05

// . codex-test-noteit-06

// . codex-test-noteit-07

// . codex-test-noteit-08

// . codex-test-noteit-09

// . codex-test-noteit-10

// . codex-test-noteit-11

// . codex-test-noteit-12

// . codex-test-noteit-13

// . codex-test-noteit-14

// . codex-test-noteit-15

// . codex-test-noteit-16
