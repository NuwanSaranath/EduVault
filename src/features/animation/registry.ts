import { AtomScale } from '@/components/animations/scenes/AtomScale';
import { CathodeRayTube } from '@/components/animations/scenes/CathodeRayTube';
import { MillikanOilDrop } from '@/components/animations/scenes/MillikanOilDrop';
import { PositiveRays } from '@/components/animations/scenes/PositiveRays';
import { RutherfordScattering } from '@/components/animations/scenes/RutherfordScattering';
import { IsotopeBuilder } from '@/components/animations/scenes/IsotopeBuilder';
import { EnergyQuantization } from '@/components/animations/scenes/EnergyQuantization';
import { EmSpectrum } from '@/components/animations/scenes/EmSpectrum';
import { DeBroglie } from '@/components/animations/scenes/DeBroglie';
import { HydrogenSpectrum } from '@/components/animations/scenes/HydrogenSpectrum';
import { OrbitalShapes } from '@/components/animations/scenes/OrbitalShapes';
import { QuantumTree } from '@/components/animations/scenes/QuantumTree';
import { IonisationJump } from '@/components/animations/scenes/IonisationJump';
import { AufbauFilling } from '@/components/animations/scenes/AufbauFilling';
import { PeriodicBuild } from '@/components/animations/scenes/PeriodicBuild';
import { PeriodicTrends } from '@/components/animations/scenes/PeriodicTrends';
import type { AnimationScene } from './types';

/**
 * The animation catalogue.
 *
 * Lessons reference scenes by **id** (`Lesson.animationIds`), never by import.
 * That keeps content data — a lesson pulled from Firestore can name an animation
 * the same way a bundled one does — while each scene stays real code, which is
 * what drawing α-particle scattering actually requires.
 *
 * An id with no scene is skipped by the player, so content can name an animation
 * before it is built without crashing the reader. `missingSceneIds` makes that
 * visible rather than silent.
 *
 * ## Stage timing
 *
 * Stages are declared here, beside the scene, rather than inside it. A scene
 * draws; the registry says what the student is being told at each moment. Two
 * consequences worth knowing:
 *
 *   - The `at` values must match the windows the scene's drawing code uses. The
 *     registry test asserts they stay ordered and inside `duration`, but only
 *     watching the animation confirms they line up with the visuals.
 *   - Captions can be reworded — by a teacher, or into another language —
 *     without touching drawing code.
 *
 * Ordered by syllabus section, which is the order they appear in the reader.
 */
export const animationScenes: AnimationScene[] = [
  // ══ 1.1 පදාර්ථය පිළිබඳ පරමාණුකවාදය ═══════════════════════════════════════
  {
    id: 'anim-atom-scale',
    sectionNumber: '1.1',
    titleSi: 'පරමාණුවේ පරිමාණය',
    titleEn: 'The scale of the atom',
    kind: 'concept',
    purposeSi:
      'ක්‍රිකට් පිටියක සිට බෝලයක් දක්වා zoom වෙමින් 10⁻¹⁰ m සහ 10⁻¹⁵ m අතර වෙනස දැනවීම.',
    duration: 17,
    Component: AtomScale,
    stages: [
      {
        id: 'stadium',
        at: 0,
        titleSi: 'පිටිය = පරමාණුව',
        titleEn: 'The stadium is the atom',
        captionSi:
          'මුළු ක්‍රිකට් පිටියම පරමාණුවක් ලෙස සිතන්න — විෂ්කම්භය ≈ 10⁻¹⁰ m. න්‍යෂ්ටිය මධ්‍යයේ ඇත, නමුත් මේ විශාලනයේදී එය පික්සලයකටත් වඩා කුඩායි.',
      },
      {
        id: 'zoom',
        at: 3,
        titleSi: 'විශාලනය ඇරඹේ',
        titleEn: 'The zoom begins',
        captionSi:
          'මධ්‍යය දෙසට zoom වෙමු. පහළ ඇති දර්ශකයෙන් විශාලනය කොපමණදැයි බලන්න — ×10¹, ×10², …',
      },
      {
        id: 'empty',
        at: 6,
        titleSi: 'හිස් අවකාශය',
        titleEn: 'Empty space',
        captionSi:
          'තවමත් කිසිවක් නැත. මෙම දිගු හිස් කොටසම තමයි පාඩම. පිටිය දැනටමත් තිරයෙන් පිටතට ගොස් ඇත, නමුත් න්‍යෂ්ටිය තවම නොපෙනේ.',
      },
      {
        id: 'nucleus',
        at: 12,
        titleSi: 'බෝලය = න්‍යෂ්ටිය',
        titleEn: 'The ball is the nucleus',
        captionSi:
          'දැන් පමණයි න්‍යෂ්ටිය පෙනෙන්නේ — විෂ්කම්භය ≈ 10⁻¹⁵ m. පරමාණුවේ ස්කන්ධයෙන් 99.9%ට වඩා මෙහි ඇත.',
      },
      {
        id: 'ratio',
        at: 14,
        titleSi: 'අනුපාතය',
        titleEn: 'The ratio',
        captionSi:
          'පරමාණුවේ විෂ්කම්භය න්‍යෂ්ටියේ විෂ්කම්භයට වඩා ~10⁵ ගුණයක් විශාලයි.',
        takeawaySi:
          'ඒ නිසා රදර්ෆෝඩ්ගේ α අංශුවලින් බහුතරය කිසිවකට නොවැදී කෙළින් ගියේ — පදාර්ථය සැබැවින්ම බොහෝ දුරට හිස් අවකාශයකි.',
      },
    ],
  },
  {
    id: 'anim-cathode-ray-tube',
    sectionNumber: '1.1.1',
    titleSi: 'කැතෝඩ කිරණ නලය',
    titleEn: 'Cathode ray tube',
    kind: 'practical',
    purposeSi:
      'එකම නලය හතර වරක් වෙනස් කරමින් කැතෝඩ කිරණවල ගුණ හතර සොයාගත් ආකාරය.',
    duration: 28,
    Component: CathodeRayTube,
    stages: [
      {
        id: 'setup',
        at: 0,
        titleSi: 'උපකරණය',
        titleEn: 'Apparatus',
        captionSi:
          'අඩු පීඩනයක් ඇති නලයක් තුළ කැතෝඩය (−) සහ ඇනෝඩය (+) අතර අධි වෝල්ටීයතාවක් යොදනු ලැබේ. ඇනෝඩයේ ඇති පැලීමෙන් සිහින් කිරණ කදම්බයක් පිටතට එයි.',
      },
      {
        id: 'straight',
        at: 3.4,
        titleSi: 'ඍජු රේඛාවල ගමන් කරයි',
        titleEn: 'Travel in straight lines',
        captionSi:
          'මාර්ගයේ ලෝහ කුරුසයක් තැබූ විට තිරය මත එහි පැහැදිලි ජායාවක් වැටේ.',
        takeawaySi: 'ජායාව තියුණු නම් → කිරණ ඍජු රේඛාවල ගමන් කරයි.',
      },
      {
        id: 'mass',
        at: 10.2,
        titleSi: 'ස්කන්ධයක් ඇත',
        titleEn: 'They carry mass',
        captionSi:
          'කුරුසය වෙනුවට කුඩා සුළං රෝදයක් තැබූ විට කිරණ වදින විට එය කැරකේ.',
        takeawaySi: 'රෝදය කැරකේ නම් → කිරණවලට ගම්‍යතාවක්, එනම් ස්කන්ධයක් ඇත.',
      },
      {
        id: 'charge',
        at: 16.4,
        titleSi: 'ඍණ ආරෝපිතයි',
        titleEn: 'They are negative',
        captionSi:
          'ආරෝපිත තැටි දෙකක් අතරින් යැවූ විට කදම්බය ධන තැටිය දෙසට නැඹුරු වේ. තැටි අතරදී මෙම නැඹුරුව පරාවලයික (parabolic) වන අතර, පිටවීමෙන් පසු ඍජුව ගමන් කරයි.',
        takeawaySi: 'ධන පැත්තට ආකර්ෂණය → අංශු ඍණ ආරෝපිතයි.',
      },
      {
        id: 'universal',
        at: 23.4,
        titleSi: 'සර්වසාධාරණ අංශුවකි',
        titleEn: 'A universal particle',
        captionSi:
          'නලයේ ගෑස් වර්ගය හෝ කැතෝඩයේ ලෝහය වෙනස් කළත් e/m අගය 1.76 × 10⁸ C g⁻¹ ලෙස වෙනස් නොවේ.',
        takeawaySi:
          'e/m වෙනස් නොවේ → ඉලෙක්ට්‍රෝනය සෑම පදාර්ථයකම ඇති සර්වසාධාරණ අංශුවකි. (ධන කිරණවල e/m ගෑස් අනුව වෙනස් වේ — ඊළඟ සජීවීකරණයෙන් සසඳන්න.)',
      },
    ],
  },
  {
    id: 'anim-millikan-oil-drop',
    sectionNumber: '1.1.1',
    titleSi: 'මිලිකන්ගේ තෙල් බිංදු පරීක්ෂාව',
    titleEn: 'Millikan oil drop experiment',
    kind: 'practical',
    purposeSi:
      'ඉලෙක්ට්‍රෝන ආරෝපණය (e) මනින ආකාරය සහ ඉන් ඉලෙක්ට්‍රෝන ස්කන්ධය ලබාගන්නා ආකාරය.',
    duration: 23,
    Component: MillikanOilDrop,
    stages: [
      {
        id: 'fall',
        at: 0,
        titleSi: 'ක්ෂේත්‍රයක් නැතිව',
        titleEn: 'Field off',
        captionSi:
          'ආරෝපිත තෙල් බිංදුවක් තැටි දෙක අතරට ඉසිනු ලැබේ. විද්‍යුත් ක්ෂේත්‍රයක් නැති විට එය ගුරුත්වය නිසා ඒකාකාර වේගයෙන් (terminal velocity) පහළට වැටේ.',
      },
      {
        id: 'balance',
        at: 7.4,
        titleSi: 'ක්ෂේත්‍රය යෙදීම',
        titleEn: 'Field on',
        captionSi:
          'තැටිවලට වෝල්ටීයතාවක් යෙදූ විට ඉහළට ක්‍රියා කරන විද්‍යුත් බලය qE, බර mg සමතුලනය කරයි. බිංදුව එකම තැන නතර වේ.',
        takeawaySi: 'qE = mg  →  q = mg/E — බිංදුවේ ආරෝපණය ගණනය කළ හැක.',
      },
      {
        id: 'data',
        at: 12,
        titleSi: 'බිංදු බොහෝ ගණනක්',
        titleEn: 'Many drops',
        captionSi:
          'බිංදු සිය ගණනක් සඳහා මෙය නැවත නැවත කරන විට, ලැබෙන ආරෝපණ අගයන් සියල්ලම එකම කුඩා අගයක ගුණාකාර වේ.',
      },
      {
        id: 'quantised',
        at: 17.4,
        titleSi: 'ආරෝපණය ක්වොන්ටීකෘතයි',
        titleEn: 'Charge is quantised',
        captionSi:
          'කිසිදු අගයක් ගුණාකාර දෙකක් අතර නොවැටේ. එනම් ආරෝපණය අඛණ්ඩ නොව, ඒකක වශයෙන් පවතී.',
        takeawaySi: 'e = 1.602 × 10⁻¹⁹ C',
      },
      {
        id: 'mass',
        at: 19,
        titleSi: 'ඉලෙක්ට්‍රෝන ස්කන්ධය',
        titleEn: 'Electron mass',
        captionSi:
          'තොම්සන් දුන්නේ e/m අනුපාතය පමණි. මිලිකන් e සොයාගත් පසු පමණක් ස්කන්ධය වෙන් කර ගණනය කළ හැකි විය.',
        takeawaySi: 'm = e ÷ (e/m) = 9.10 × 10⁻²⁸ g ≈ (හයිඩ්‍රජන් පරමාණුවේ ස්කන්ධය)/1837',
      },
    ],
  },
  {
    id: 'anim-positive-rays',
    sectionNumber: '1.1.3',
    titleSi: 'ධන කිරණවල ගුණ',
    titleEn: 'Properties of positive rays',
    kind: 'practical',
    purposeSi:
      'කැතෝඩ කිරණවල e/m නියත වන අතර ධන කිරණවල e/m ගෑස් අනුව වෙනස් වන්නේ ඇයි යන්න.',
    duration: 18,
    Component: PositiveRays,
    stages: [
      {
        id: 'setup',
        at: 0,
        titleSi: 'නල දෙක',
        titleEn: 'Two tubes',
        captionSi:
          'ඉහළ නලයේ කැතෝඩ කිරණ (ඉලෙක්ට්‍රෝන). පහළ නලයේ සිදුරු සහිත කැතෝඩයක් හරහා විරුද්ධ දිශාවට යන ධන කිරණ. දෙකම එකම ආරෝපිත තැටි අතරින් යවනු ලැබේ.',
      },
      {
        id: 'hydrogen',
        at: 4,
        titleSi: 'ගෑසය: H₂',
        titleEn: 'Gas: hydrogen',
        captionSi:
          'දෙකම නැඹුරු වේ. e/m විශාල නම් නැඹුරුව විශාලයි — ඉලෙක්ට්‍රෝනයේ e/m ධන අයනයට වඩා 1000 ගුණයකට වැඩියි.',
      },
      {
        id: 'helium',
        at: 9,
        titleSi: 'ගෑසය: He',
        titleEn: 'Gas: helium',
        captionSi:
          'ගෑසය වෙනස් කරමු. ඉහළ නලය කිසිසේත් වෙනස් නොවේ. පහළ නලයේ නැඹුරුව අඩු වේ — He අයනය බරයි, එබැවින් e/m අඩුයි.',
      },
      {
        id: 'neon',
        at: 13,
        titleSi: 'ගෑසය: Ne',
        titleEn: 'Gas: neon',
        captionSi:
          'තවත් බර ගෑසයක්. නැවතත් ඉහළ නලය නොවෙනස්, පහළ නලයේ නැඹුරුව තවත් අඩු වේ.',
      },
      {
        id: 'conclusion',
        at: 15,
        titleSi: 'නිගමනය',
        titleEn: 'Conclusion',
        captionSi:
          'කැතෝඩ කිරණවල අංශුව සෑම විටම එකමයි — ඉලෙක්ට්‍රෝනය. ධන කිරණවල අංශුව නලයේ ඇති ගෑසයේ අයනයයි, එබැවින් ගෑසය සමඟ වෙනස් වේ.',
        takeawaySi:
          'e/m නියතද? → ඉලෙක්ට්‍රෝන (සර්වසාධාරණ). e/m ගෑසය සමඟ වෙනස්ද? → ධන අයන. විභාග ප්‍රශ්නවල මෙම වෙනස නිතර අසයි.',
      },
    ],
  },
  {
    id: 'anim-rutherford-gold-foil',
    sectionNumber: '1.1.4',
    titleSi: 'රදර්ෆෝඩ්ගේ රන්පත් පරීක්ෂාව',
    titleEn: "Rutherford's gold foil experiment",
    kind: 'practical',
    purposeSi:
      'නිරීක්ෂණ තුනකින් න්‍යෂ්ටියේ පැවැත්ම නිගමනය කරන ආකාරය — විභාගයට වැදගත්ම පරීක්ෂණය.',
    duration: 26,
    Component: RutherfordScattering,
    stages: [
      {
        id: 'setup',
        at: 0,
        titleSi: 'උපකරණය',
        titleEn: 'Apparatus',
        captionSi:
          'රේඩියෝ ක්‍රියාකාරී ප්‍රභවයකින් α අංශු කදම්බයක් ඉතා තුනී රන් තලයකට යොමු කෙරේ. වටා ඇති ප්‍රතිදීප්ත (ZnS) තිරය මත අංශුවක් වදින සෑම තැනකම කුඩා ආලෝක දැල්වීමක් පෙනේ.',
      },
      {
        id: 'straight',
        at: 4.2,
        titleSi: 'නිරීක්ෂණය 1 — බහුතරය කෙළින්',
        titleEn: 'Observation 1 — most pass straight',
        captionSi:
          'α අංශුවලින් අතිමහත් බහුතරයක් කිසිදු වෙනසක් නොමැතිව තලය හරහා කෙළින් ගමන් කරයි.',
        takeawaySi: 'නිගමනය: පරමාණුවේ බොහෝ කොටස හිස් අවකාශයකි.',
      },
      {
        id: 'deflect',
        at: 10.4,
        titleSi: 'නිරීක්ෂණය 2 — ස්වල්පයක් නැඹුරු',
        titleEn: 'Observation 2 — a few deflect',
        captionSi:
          'සුළු ප්‍රමාණයක් කුඩා කෝණවලින් නැඹුරු වේ. න්‍යෂ්ටියට ළං වී ගමන් කරන තරමට නැඹුරු කෝණය වැඩි වන බව බලන්න.',
        takeawaySi: 'නිගමනය: පරමාණුව තුළ ධන ආරෝපිත කොටසක් ඇත (α ද ධන නිසා විකර්ෂණය).',
      },
      {
        id: 'backscatter',
        at: 15.6,
        titleSi: 'නිරීක්ෂණය 3 — ඉතා ටිකක් ආපහු',
        titleEn: 'Observation 3 — very few bounce back',
        captionSi:
          'දස දහසකට එකක් පමණ 90°ට වඩා විශාල කෝණයකින්, සමහරක් සම්පූර්ණයෙන්ම ආපසු හැරේ. රදර්ෆෝඩ් මෙය "කඩදාසියකට වෙඩි තැබූ විට උණ්ඩය ආපසු පැමිණීමක්" ලෙස හැඳින්වීය.',
        takeawaySi:
          'නිගමනය: ධන ආරෝපණය හා ස්කන්ධය ඉතා කුඩා, ඝන න්‍යෂ්ටියක සංකේන්ද්‍රිත වී ඇත.',
      },
      {
        id: 'conclusion',
        at: 20.2,
        titleSi: 'තොම්සන්ගේ ආකෘතිය ප්‍රතික්ෂේප වීම',
        titleEn: 'Thomson’s model is rejected',
        captionSi:
          'තොම්සන්ගේ "මුං කැවුම්" ආකෘතියේ ධන ආරෝපණය පරමාණුව පුරා විසිරී ඇත. එවැනි ආකෘතියකින් α අංශුවක් ආපසු හැරවීමට තරම් ප්‍රබල විකර්ෂණයක් ඇති විය නොහැක.',
        takeawaySi:
          'නිරීක්ෂණ 3 → නිගමන 3. මෙය structured ප්‍රශ්නවල නිතර අසන ආකෘතියයි.',
      },
    ],
  },
  {
    id: 'anim-isotopes',
    sectionNumber: '1.1.5',
    titleSi: 'සමස්ථානික ගොඩනැගීම',
    titleEn: 'Building isotopes',
    kind: 'concept',
    purposeSi: 'එකම Z, වෙනස් A — සහ ඉලෙක්ට්‍රෝන ගණන කිසිසේත් වෙනස් නොවන බව.',
    duration: 18,
    Component: IsotopeBuilder,
    stages: [
      {
        id: 'c12',
        at: 0,
        titleSi: '¹²C',
        titleEn: 'Carbon-12',
        captionSi:
          'ප්‍රෝටෝන 6ක් (රතු) සහ ඉලෙක්ට්‍රෝන 6ක් (නිල්) තබමු. දැන් නියුට්‍රෝන 6ක් (අළු) එකතු කරමු. A = 6 + 6 = 12.',
      },
      {
        id: 'c13',
        at: 5,
        titleSi: '¹³C',
        titleEn: 'Carbon-13',
        captionSi:
          'ප්‍රෝටෝන සහ ඉලෙක්ට්‍රෝන ගණන අත නොගසා, නියුට්‍රෝන එකක් පමණක් වැඩි කරමු. A = 6 + 7 = 13.',
      },
      {
        id: 'c14',
        at: 9.4,
        titleSi: '¹⁴C',
        titleEn: 'Carbon-14',
        captionSi:
          'නැවතත් නියුට්‍රෝන එකක් පමණි. A = 6 + 8 = 14. ප්‍රෝටෝන තවමත් 6යි, ඉලෙක්ට්‍රෝන තවමත් 6යි.',
      },
      {
        id: 'conclusion',
        at: 15.6,
        titleSi: 'නිගමනය',
        titleEn: 'Conclusion',
        captionSi:
          'Z එකම නිසා තුනම කාබන්. ඉලෙක්ට්‍රෝන විනයාසය එකම නිසා රසායනික ගුණ එකමයි. වෙනස A — එනම් ස්කන්ධය පමණි.',
        takeawaySi:
          'නියුට්‍රෝන ගණන = A − Z. සමස්ථානිකවල ඉලෙක්ට්‍රෝන ගණන වෙනස් යැයි කිසිවිටෙක නොලියන්න.',
      },
    ],
  },

  // ══ 1.2 විද්‍යුත්-චුම්බක විකිරණ ══════════════════════════════════════════
  {
    id: 'anim-energy-quantisation',
    sectionNumber: '1.2.1',
    titleSi: 'ශක්ති ක්වොන්ටම්කරණය',
    titleEn: 'Energy quantisation',
    kind: 'concept',
    purposeSi: 'බෑවුමක් සහ තරප්පු පෙළක් සසඳමින් "ක්වොන්ටීකෘත" යන්නෙහි අර්ථය.',
    duration: 18,
    Component: EnergyQuantization,
    stages: [
      {
        id: 'compare',
        at: 0,
        titleSi: 'බෑවුම සහ තරප්පුව',
        titleEn: 'Ramp and staircase',
        captionSi:
          'වම්පස බෑවුම — අඛණ්ඩ. දකුණුපස තරප්පු පෙළ — ක්වොන්ටීකෘත. දෙකේම උස එකයි; වෙනස වන්නේ නැවතිය හැකි ස්ථාන පමණි.',
      },
      {
        id: 'ramp',
        at: 3.6,
        titleSi: 'බෑවුමේ බෝලය',
        titleEn: 'Ball on the ramp',
        captionSi: 'බෑවුමේ බෝලය ඕනෑම උසක නැවතිය හැක — අතරමැදි අගයන් සියල්ලම වලංගුයි.',
      },
      {
        id: 'stairs',
        at: 6.0,
        titleSi: 'තරප්පුවේ බෝලය',
        titleEn: 'Ball on the stairs',
        captionSi: 'තරප්පුවේ බෝලයට නැවතිය හැක්කේ පඩි මත පමණි.',
      },
      {
        id: 'forbidden',
        at: 11.4,
        titleSi: 'ප්‍රමාණවත් නොවන ශක්තිය',
        titleEn: 'Not enough energy',
        captionSi:
          'ඊළඟ පඩියට යාමට තරම් ශක්තියක් නැත්නම් බෝලය අතරමැද නතර නොවේ — ආපසු පැරණි පඩියටම වැටේ.',
        takeawaySi:
          'මෙයයි ඉලෙක්ට්‍රෝනයක් "අඩක්" උත්තේජනය නොවන්නේ. ෆෝටෝනයේ ශක්තිය හරියටම ගැලපිය යුතුයි.',
      },
      {
        id: 'conclusion',
        at: 16.0,
        titleSi: 'පරමාණුවට යෙදීම',
        titleEn: 'Applied to the atom',
        captionSi:
          'පරමාණුවක ඉලෙක්ට්‍රෝන ශක්තිය තරප්පු පෙළක් වැනියි. ශක්තිය හුවමාරු වන්නේ E = hν ලෙස නිශ්චිත පැකට්ටු (ක්වොන්ටම්) වලින් පමණි.',
        takeawaySi: 'E = hν  |  c = λν  →  E = hc/λ',
      },
    ],
  },
  {
    id: 'anim-em-spectrum',
    sectionNumber: '1.2',
    titleSi: 'විද්‍යුත්-චුම්බක වර්ණාවලිය',
    titleEn: 'The electromagnetic spectrum',
    kind: 'concept',
    purposeSi:
      'λ සහ ν ප්‍රතිලෝම වන ආකාරය සහ දෘශ්‍ය ආලෝකය මුළු වර්ණාවලියෙන් කොතරම් කුඩාදැයි.',
    duration: 20,
    Component: EmSpectrum,
    stages: [
      {
        id: 'bands',
        at: 0,
        titleSi: 'මුළු වර්ණාවලිය',
        titleEn: 'The whole spectrum',
        captionSi:
          'ගැමා කිරණවල සිට රේඩියෝ තරංග දක්වා. අක්ෂ දෙක විරුද්ධ දිශාවලට යයි: වමට ν වැඩි, දකුණට λ වැඩි. සුදු කොටුවෙන් සලකුණු කර ඇත්තේ දෘශ්‍ය කලාපයයි.',
      },
      {
        id: 'inverse',
        at: 5,
        titleSi: 'λ සහ ν ප්‍රතිලෝමයි',
        titleEn: 'λ and ν are inverse',
        captionSi:
          'දර්ශකය දකුණට යද්දී පහළ ඇති තරංගය දික් වේ. λ වැඩි වන විට ν අඩු වේ — මෙය c = λν සම්බන්ධයේ සෘජු ප්‍රතිඵලයයි.',
        takeawaySi: 'c = λν (c = 3.00 × 10⁸ m s⁻¹, නියතයි)',
      },
      {
        id: 'visible',
        at: 12,
        titleSi: 'දෘශ්‍ය කලාපය විශාලනය',
        titleEn: 'The visible band expanded',
        captionSi:
          'ඉහළ ඇති සිහින් කොටස පමණයි අපට පෙනෙන්නේ — 400 සිට 750 nm දක්වා. එය විශාල කර බැලුවම තමයි ඉන්ද්‍රධනුවේ වර්ණ පෙනෙන්නේ.',
      },
      {
        id: 'conclusion',
        at: 17,
        titleSi: 'නිගමනය',
        titleEn: 'Conclusion',
        captionSi:
          'මුළු වර්ණාවලියේ දශම 15ක පරාසයෙන් අප දකින්නේ දශමයෙන් තුනෙන් එකකටත් අඩු කොටසක් පමණි.',
        takeawaySi:
          'දෘශ්‍ය ආලෝකය EM විකිරණවල ඉතා කුඩා කොටසක් පමණි. λ කුඩා නම් ශක්තිය වැඩියි (E = hc/λ).',
      },
    ],
  },
  {
    id: 'anim-de-broglie',
    sectionNumber: '1.2',
    titleSi: 'ද බ්‍රොග්ලි සම්බන්ධය',
    titleEn: 'The de Broglie relation',
    kind: 'concept',
    purposeSi:
      '"එහෙනම් මගේ බෝලෙත් තරංගයක්ද?" — ඔව්, නමුත් ඇයි නොදැනෙන්නේ කියන එකට උත්තරය.',
    duration: 17,
    Component: DeBroglie,
    stages: [
      {
        id: 'objects',
        at: 0,
        titleSi: 'වස්තු දෙකක්',
        titleEn: 'Two objects',
        captionSi:
          'වම්පස ක්‍රිකට් බෝලයක්, දකුණුපස ඉලෙක්ට්‍රෝනයක්. දෙකම චලනය වෙමින් ඇත, එබැවින් දෙකටම ද බ්‍රොග්ලි සම්බන්ධය අදාළයි.',
      },
      {
        id: 'numbers',
        at: 4,
        titleSi: 'සංඛ්‍යා',
        titleEn: 'The numbers',
        captionSi:
          'λ = h/mv. h = 6.626 × 10⁻³⁴ J s — ඉතා කුඩායි. එබැවින් λ තීරණය කරන්නේ mv කොපමණ විශාලද යන්නයි.',
      },
      {
        id: 'ball',
        at: 8,
        titleSi: 'බෝලයේ තරංගය',
        titleEn: 'The ball’s wavelength',
        captionSi:
          'බෝලයේ λ ≈ 10⁻³⁴ m. එය රූපයේ ඍජු රේඛාවක් ලෙස පෙනේ — තරංගය නැති නිසා නොව, අඳින්නට බැරි තරම් කුඩා නිසා.',
      },
      {
        id: 'electron',
        at: 11,
        titleSi: 'ඉලෙක්ට්‍රෝනයේ තරංගය',
        titleEn: 'The electron’s wavelength',
        captionSi:
          'එකම පරිමාණයෙන් අඳින ලද ඉලෙක්ට්‍රෝනයේ λ ≈ 7 × 10⁻¹⁰ m — පරමාණුවක තරමට සමානයි, එබැවින් මැනිය හැකියි.',
        takeawaySi: 'ඒ නිසයි ඉලෙක්ට්‍රෝන විවර්තනය (diffraction) නිරීක්ෂණය කළ හැක්කේ.',
      },
      {
        id: 'conclusion',
        at: 14,
        titleSi: 'උත්තරය',
        titleEn: 'The answer',
        captionSi:
          'ඔව් — ඔබේ බෝලයටත් තරංග ස්වභාවයක් ඇත. නමුත් m විශාල නිසා λ කුඩා වී, එය කිසිසේත් නොදැනේ.',
        takeawaySi: 'λ = h/mv — m විශාල නම් λ නොසැලකිය හැකි තරම් කුඩායි.',
      },
    ],
  },

  // ══ 1.3 ඉලෙක්ට්‍රෝනික ශක්ති මට්ටම් ═══════════════════════════════════════
  {
    id: 'anim-hydrogen-spectrum',
    sectionNumber: '1.3.1',
    titleSi: 'හයිඩ්‍රජන් වර්ණාවලිය',
    titleEn: 'The hydrogen spectrum',
    kind: 'concept',
    purposeSi:
      'රේඛීය වර්ණාවලියක් ශක්ති මට්ටම් ක්වොන්ටීකෘත බව ඔප්පු කරන්නේ කෙසේද යන්න.',
    duration: 27,
    Component: HydrogenSpectrum,
    stages: [
      {
        id: 'levels',
        at: 0,
        titleSi: 'ශක්ති මට්ටම්',
        titleEn: 'Energy levels',
        captionSi:
          'Eₙ = −1312/n² kJ mol⁻¹. n වැඩි වන විට මට්ටම් එකිනෙක ළං වෙමින් n = ∞ දී E = 0 කරා අභිසාරී වේ.',
      },
      {
        id: 'absorb',
        at: 4.0,
        titleSi: 'අවශෝෂණය',
        titleEn: 'Absorption',
        captionSi:
          'ශක්තිය ලැබුණු විට ඉලෙක්ට්‍රෝනය n = 1 සිට n = 3 දක්වා ඉහළ මට්ටමකට යයි (උත්තේජනය).',
      },
      {
        id: 'emit',
        at: 8.4,
        titleSi: 'විමෝචනය',
        titleEn: 'Emission',
        captionSi:
          'ඉලෙක්ට්‍රෝනය ආපසු පහළට වැටෙන විට, මට්ටම් දෙක අතර ශක්ති වෙනස (ΔE) හරියටම ඇති ෆෝටෝනයක් පිටවේ.',
        takeawaySi: 'ΔE = hc/λ — විශාල පිම්මක් → කුඩා λ (නිල්/දම් පැත්තට).',
      },
      {
        id: 'balmer',
        at: 13.0,
        titleSi: 'බාමර් ශ්‍රේණිය',
        titleEn: 'Balmer series',
        captionSi:
          'n = 3, 4, 5, 6 සිට n = 2 දක්වා වැටීම් දෘශ්‍ය කලාපයේ රේඛා හතරක් දෙයි: 656, 486, 434, 410 nm. ඔබේ පොතේ අගයන් සමඟ සසඳන්න.',
      },
      {
        id: 'lyman',
        at: 22.0,
        titleSi: 'ලයිමන් ශ්‍රේණිය',
        titleEn: 'Lyman series',
        captionSi:
          'n = 2 සිට n = 1 දක්වා වැටීම ඉතා විශාල ΔE එකක් නිසා UV කලාපයේ රේඛාවක් දෙයි — ඇසට නොපෙනේ.',
        takeawaySi: 'ලයිමන් → n=1 (UV) | බාමර් → n=2 (දෘශ්‍ය) | පාෂන් → n=3 (IR)',
      },
      {
        id: 'converge',
        at: 24.4,
        titleSi: 'අභිසාරීතාව',
        titleEn: 'Convergence',
        captionSi:
          'ඉහළ මට්ටම් එකට තදවන නිසා, ඒවායින් එන රේඛාද වර්ණාවලියේ එකට තදවේ. වර්ණාවලිය අඛණ්ඩ නොවේ — එබැවින් ශක්තියද අඛණ්ඩ නොවේ.',
        takeawaySi:
          'රේඛීය වර්ණාවලිය = ශක්ති මට්ටම් ක්වොන්ටීකෘත බවට සෘජු සාක්ෂිය.',
      },
    ],
  },
  {
    id: 'anim-orbital-shapes',
    sectionNumber: '1.3.2',
    titleSi: 'කාක්ෂිකවල හැඩ',
    titleEn: 'Shapes of orbitals',
    kind: 'concept',
    purposeSi:
      'p කාක්ෂික තුන "එකම හැඩය, වෙනස් දිශාව" බව එකක් අනෙකට කරකවා පෙන්වීම.',
    duration: 22,
    Component: OrbitalShapes,
    stages: [
      {
        id: 'axes',
        at: 0,
        titleSi: 'අක්ෂ තුන',
        titleEn: 'The three axes',
        captionSi:
          'x, y, z අක්ෂ තුන. සියලුම කාක්ෂික මේ එකම අවකාශයේ අඳිනු ලැබේ, එබැවින් ඒවා එකිනෙක සමඟ සැසඳිය හැක.',
      },
      {
        id: 's',
        at: 3,
        titleSi: 's කාක්ෂිකය',
        titleEn: 'The s orbital',
        captionSi:
          's කාක්ෂිකය ගෝලාකාරයි — කිසිදු දිශාවකට මනාපයක් නැත. l = 0 වන විට කාක්ෂිකයක් පමණයි.',
      },
      {
        id: 'px',
        at: 8.4,
        titleSi: 'pₓ කාක්ෂිකය',
        titleEn: 'The pₓ orbital',
        captionSi:
          'p කාක්ෂිකයක් ඩම්බෙල් හැඩයි — න්‍යෂ්ටියේ දී ගැටයක් (node) ඇත, එනම් එතැන ඉලෙක්ට්‍රෝනය කිසිවිටෙක නොලැබේ. මෙය x අක්ෂය දිගේ ඇත.',
      },
      {
        id: 'py',
        at: 12.4,
        titleSi: 'කරකවමු → p_y',
        titleEn: 'Rotate → p_y',
        captionSi:
          'අලුත් හැඩයක් අඳින්නේ නැත — pₓ හි පිටපතක් මූලයෙන් කරකවා y අක්ෂයට ගෙන එනු ලැබේ. හැඩය කිසිසේත් වෙනස් නොවේ.',
        takeawaySi: 'එකම හැඩය, වෙනස් අභිමුඛතාව — ශක්තියද එකමයි (පරිහරණය, degenerate).',
      },
      {
        id: 'pz',
        at: 16.4,
        titleSi: 'නැවතත් කරකවමු → p_z',
        titleEn: 'Rotate again → p_z',
        captionSi: 'තෙවැනි වතාවටත් එම හැඩයම — දැන් z අක්ෂය දිගේ.',
      },
      {
        id: 'conclusion',
        at: 19.4,
        titleSi: 'නිගමනය',
        titleEn: 'Conclusion',
        captionSi:
          'l = 0 → s (කාක්ෂික 1). l = 1 → p (කාක්ෂික 3, එකම ශක්තියෙන්). l = 2 → d (කාක්ෂික 5).',
        takeawaySi: 'කාක්ෂික ගණන = 2l + 1',
      },
    ],
  },
  {
    id: 'anim-quantum-tree',
    sectionNumber: '1.3.3',
    titleSi: 'ක්වොන්ටම් අංක ගස් සටහන',
    titleEn: 'Quantum number tree',
    kind: 'concept',
    purposeSi:
      '"ඇයි n = 2 ට කාක්ෂික 4ක්" කියන එක ගණන් කරලා තහවුරු කරගැනීම — n² රීතිය.',
    duration: 20,
    Component: QuantumTree,
    stages: [
      {
        id: 'n1',
        at: 0,
        titleSi: 'n = 1',
        titleEn: 'Shell n = 1',
        captionSi:
          'n = 1 නම් l ට ගත හැක්කේ 0 පමණි (l = 0 සිට n−1 දක්වා). l = 0 නම් mₗ = 0 පමණි. එබැවින් කාක්ෂිකයක් පමණි.',
      },
      {
        id: 'n2',
        at: 5.2,
        titleSi: 'n = 2',
        titleEn: 'Shell n = 2',
        captionSi:
          'දැන් l = 0 සහ l = 1. l = 0 → mₗ = 0 (කාක්ෂික 1). l = 1 → mₗ = −1, 0, +1 (කාක්ෂික 3). මුළු ගණන 4යි — ගණන් කර බලන්න.',
      },
      {
        id: 'n3',
        at: 11.2,
        titleSi: 'n = 3',
        titleEn: 'Shell n = 3',
        captionSi:
          'l = 0, 1, 2. කාක්ෂික 1 + 3 + 5 = 9. සෑම l අගයකට ම mₗ අගයන් (2l + 1) ක් ඇත.',
      },
      {
        id: 'rule',
        at: 17,
        titleSi: 'n² රීතිය',
        titleEn: 'The n² rule',
        captionSi:
          'ලැබුණු ගණන් 1, 4, 9 — එනම් 1², 2², 3². සෑම කාක්ෂිකයකට ම ඉලෙක්ට්‍රෝන 2ක් ගත හැකි නිසා කවචයක උපරිම ඉලෙක්ට්‍රෝන ගණන 2n².',
        takeawaySi: 'කාක්ෂික = n²  ·  උපරිම ඉලෙක්ට්‍රෝන = 2n²  — ශාඛා ගණන් කර ලබාගත හැක.',
      },
    ],
  },
  {
    id: 'anim-ionisation-jump',
    sectionNumber: '1.3',
    titleSi: 'අනුක්‍රමික අයනීකරණ ශක්ති',
    titleEn: 'Successive ionisation energies',
    kind: 'concept',
    purposeSi:
      'දත්ත වගුවක් දුන් විට "විශාල පිම්ම" බලා සංයුජතා ඉලෙක්ට්‍රෝන ගණන කියන ආකාරය.',
    duration: 19,
    Component: IonisationJump,
    stages: [
      {
        id: 'axes',
        at: 0,
        titleSi: 'log පරිමාණය',
        titleEn: 'Log scale',
        captionSi:
          'අගයන් 500 සිට 27,000 දක්වා විහිදෙන නිසා log පරිමාණයක් භාවිතා කරයි. රේඛීය පරිමාණයක නම් පළමු බාර් නොපෙනෙන අතර පිම්මද සැඟවේ.',
      },
      {
        id: 'na',
        at: 2.4,
        titleSi: 'සෝඩියම් (Na)',
        titleEn: 'Sodium',
        captionSi:
          'පළමු අයනීකරණ ශක්තිය 496 kJ mol⁻¹. දෙවැන්න 4562 — ගුණයකට වඩා 9ක් වැඩියි. දෙවැනි ඉලෙක්ට්‍රෝනය පැමිණෙන්නේ සම්පූර්ණ අභ්‍යන්තර කවචයකිනි.',
        takeawaySi: 'පිම්ම 1 වැන්නෙන් පසු → සංයුජතා ඉලෙක්ට්‍රෝන 1 → කාණ්ඩය 1.',
      },
      {
        id: 'mg',
        at: 8,
        titleSi: 'මැග්නීසියම් (Mg)',
        titleEn: 'Magnesium',
        captionSi:
          'දැන් පළමු දෙකම සාපේක්ෂව අඩුයි (738, 1451). පිම්ම එන්නේ තෙවැන්නට — 7733.',
        takeawaySi: 'පිම්ම 2 වැන්නෙන් පසු → සංයුජතා ඉලෙක්ට්‍රෝන 2 → කාණ්ඩය 2.',
      },
      {
        id: 'al',
        at: 13,
        titleSi: 'ඇලුමිනියම් (Al)',
        titleEn: 'Aluminium',
        captionSi: 'මෙවර පිම්ම තවත් එක් තැනක් ඉදිරියට ගොස් සිව්වැන්නට එයි.',
        takeawaySi: 'පිම්ම 3 වැන්නෙන් පසු → සංයුජතා ඉලෙක්ට්‍රෝන 3 → කාණ්ඩය 13.',
      },
      {
        id: 'rule',
        at: 16.4,
        titleSi: 'රීතිය',
        titleEn: 'The rule',
        captionSi:
          'විභාගයේ දත්ත වගුවක් දුන් විට: අනුපාත බලා විශාලම පිම්ම සොයන්න. ඊට පෙර ඇති අගයන් ගණන සංයුජතා ඉලෙක්ට්‍රෝන ගණනයි.',
        takeawaySi:
          'පිම්මට පෙර ඇති ගණන = සංයුජතා ඉලෙක්ට්‍රෝන = කාණ්ඩය (s සහ p ගොනු සඳහා).',
      },
    ],
  },

  // ══ 1.4 ඉලෙක්ට්‍රෝන විනයාස ═══════════════════════════════════════════════
  {
    id: 'anim-aufbau-filling',
    sectionNumber: '1.4',
    titleSi: 'ඉලෙක්ට්‍රෝන විනයාස පිරවීම',
    titleEn: 'Electron configuration filling',
    kind: 'concept',
    purposeSi:
      'අවුෆ්බාවු, පව්ලි සහ හුන්ඩ් නීති තුන එකට ක්‍රියා කරන ආකාරය — සහ Cr, Cu අපගමන.',
    duration: 30,
    Component: AufbauFilling,
    stages: [
      {
        id: 'ladder',
        at: 0,
        titleSi: 'ශක්ති ඉණිමඟ',
        titleEn: 'The energy ladder',
        captionSi:
          'උපකවච ශක්තිය අනුව පෙළගස්වා ඇත, අඩුම පහළින්. වම්පස ඇති අංකය පිරවෙන අනුපිළිවෙලයි. 4s, 3d ට වඩා පහළින් ඇති බව සලකන්න — මෙය පසුව වැදගත් වේ.',
      },
      {
        id: 'pauli',
        at: 4,
        titleSi: 'පව්ලි බහිෂ්කාර මූලධර්මය',
        titleEn: 'Pauli exclusion principle',
        captionSi:
          'H ට ඉලෙක්ට්‍රෝන 1යි → 1s¹. He ට 2යි → 1s². එකම කොටුවේ ඉලෙක්ට්‍රෝන දෙකක් තිබිය හැක්කේ භ්‍රමණ විරුද්ධ නම් පමණි (↑↓), කිසිවිටෙක ↑↑ නොවේ.',
        takeawaySi: 'කාක්ෂිකයකට උපරිම ඉලෙක්ට්‍රෝන 2යි, විරුද්ධ භ්‍රමණවලින්.',
      },
      {
        id: 'hund',
        at: 10.5,
        titleSi: 'හුන්ඩ්ගේ නීතිය',
        titleEn: 'Hund’s rule',
        captionSi:
          'B ට 2p¹. C ට 2p² — දෙවැනි ඉලෙක්ට්‍රෝනය පළමු කොටුවට ජෝඩු නොවී, හිස් කොටුවකට යයි.',
      },
      {
        id: 'violation',
        at: 14.4,
        titleSi: 'වැරදි ආකාරය',
        titleEn: 'The wrong way',
        captionSi:
          'මෙසේ ලිව්වොත් වැරදියි. හිස් කොටු තිබියදී ජෝඩු වීම හුන්ඩ්ගේ නීතිය කඩ කිරීමකි — ඉලෙක්ට්‍රෝන දෙකක් එකම කොටුවක තිබීම විකර්ෂණය වැඩි කරයි.',
        takeawaySi: 'හිස් කොටුවක් තියෙනකම් ජෝඩු කරන්න එපා.',
      },
      {
        id: 'correct',
        at: 17.5,
        titleSi: 'නිවැරදි ආකාරය',
        titleEn: 'The right way',
        captionSi:
          'N ට 2p³ — තුනම තනි තනිව, එකම දිශාවට. O ට 2p⁴ දී පමණයි ජෝඩු වීම ඇරඹෙන්නේ, මොකද දැන් හිස් කොටු නැත.',
      },
      {
        id: 'anomalies',
        at: 22,
        titleSi: 'Cr සහ Cu අපගමන',
        titleEn: 'The Cr and Cu anomalies',
        captionSi:
          'Cr අපේක්ෂිත 4s² 3d⁴ නොව 4s¹ 3d⁵ ලෙසත්, Cu අපේක්ෂිත 4s² 3d⁹ නොව 4s¹ 3d¹⁰ ලෙසත් පවතී. 4s ඉලෙක්ට්‍රෝනයක් 3d වෙත ගමන් කරයි.',
        takeawaySi:
          'අර්ධ පිරුණු (d⁵) හෝ සම්පූර්ණ පිරුණු (d¹⁰) උපකවචයක් අමතර ස්ථායිතාවක් දෙයි.',
      },
      {
        id: 'conclusion',
        at: 27.4,
        titleSi: 'නීති තුන',
        titleEn: 'The three rules',
        captionSi:
          'අවුෆ්බාවු කුමන උපකවචයදැයි කියයි. පව්ලි එකකට කීයදැයි කියයි. හුන්ඩ් ඒවා බෙදෙන ආකාරය කියයි.',
        takeawaySi: 'අවුෆ්බාවු (පිළිවෙල) → පව්ලි (කොටුවකට 2යි, ↑↓) → හුන්ඩ් (තනිව පළමුව)',
      },
    ],
  },

  // ══ 1.5 ආවර්තිතා වගුව ═══════════════════════════════════════════════════
  {
    id: 'anim-periodic-build',
    sectionNumber: '1.5',
    titleSi: 'ආවර්තිතා වගුව ගොඩනැගීම',
    titleEn: 'Building the periodic table',
    kind: 'concept',
    purposeSi:
      'වගුවේ හැඩය ඉලෙක්ට්‍රෝන විනයාසයෙන් ම එන බව ගොනු එකින් එක තබමින් පෙන්වීම.',
    duration: 27,
    Component: PeriodicBuild,
    stages: [
      {
        id: 'grid',
        at: 0,
        titleSi: 'හිස් රාමුව',
        titleEn: 'The empty frame',
        captionSi:
          'මූලද්‍රව්‍ය පිහිටන තැන් පමණක් සලකුණු කර ඇත. පහළින් ඇති තිත් රේඛා කොටස f ගොනුවයි — එය වෙනම තිබෙන්නේ ඇයිදැයි අන්තිමට පැහැදිලි වේ.',
      },
      {
        id: 's',
        at: 3,
        titleSi: 's ගොනුව',
        titleEn: 'The s-block',
        captionSi:
          's උපකවචයට ගත හැක්කේ ඉලෙක්ට්‍රෝන 2ක් පමණි, එබැවින් s ගොනුව තීරු 2ක් පළලයි. කාණ්ඩ 1 සහ 2.',
      },
      {
        id: 'p',
        at: 9,
        titleSi: 'p ගොනුව',
        titleEn: 'The p-block',
        captionSi:
          'p උපකවචයට ඉලෙක්ට්‍රෝන 6ක් (කාක්ෂික 3 × 2) ගත හැකි නිසා p ගොනුව තීරු 6ක් පළලයි. කාණ්ඩ 13–18.',
      },
      {
        id: 'd',
        at: 15,
        titleSi: 'd ගොනුව',
        titleEn: 'The d-block',
        captionSi:
          'd උපකවචයට ඉලෙක්ට්‍රෝන 10ක් (කාක්ෂික 5 × 2). එය s සහ p අතරට වැදගෙන යයි — ඒ නිසයි ආවර්ත 2 සහ 3 හි මැද හිස්ව තිබෙන්නේ, සහ ආවර්ත 4 එකපාරටම දිග වන්නේ.',
        takeawaySi: '4s, 3d ට කලින් පිරවෙන නිසා d ගොනුව ආරම්භ වන්නේ ආවර්ත 4 සිටයි.',
      },
      {
        id: 'f',
        at: 21,
        titleSi: 'f ගොනුව',
        titleEn: 'The f-block',
        captionSi:
          'f උපකවචයට ඉලෙක්ට්‍රෝන 14ක්. එය ඇතුළට දැම්මොත් වගුව මුද්‍රණය කළ නොහැකි තරම් පළල් වන නිසා පහළින් වෙන් කර දක්වයි.',
      },
      {
        id: 'conclusion',
        at: 24,
        titleSi: 'නිගමනය',
        titleEn: 'Conclusion',
        captionSi:
          'වගුවේ හැඩය අහම්බයක් නොවේ. සෑම ගොනුවක ම පළල එම උපකවචයට ගත හැකි ඉලෙක්ට්‍රෝන ගණනයි.',
        takeawaySi:
          'කාණ්ඩය = සංයුජතා ඉලෙක්ට්‍රෝන ගණන · ආවර්තය = පිටතම කවචයේ n අගය · ගොනුව = අවසන් ඉලෙක්ට්‍රෝනය ගිය උපකවචය.',
      },
    ],
  },

  // ══ 1.6 ආවර්තීය නැඹුරුතා ════════════════════════════════════════════════
  {
    id: 'anim-periodic-trends',
    sectionNumber: '1.6',
    titleSi: 'ආවර්තීය නැඹුරුතා',
    titleEn: 'Periodic trends',
    kind: 'concept',
    purposeSi:
      'නැඹුරුතා හතරම එකම වගුව මත පෙන්වමින්, ඒ සියල්ල පිටුපස ඇත්තේ එකම හේතුව බව.',
    duration: 29,
    Component: PeriodicTrends,
    stages: [
      {
        id: 'table',
        at: 0,
        titleSi: 'එකම වගුව',
        titleEn: 'One table',
        captionSi:
          'නැඹුරුතා හතරම මේ එකම වගුව මත පෙන්වනු ලැබේ. වගුව කිසිසේත් චලනය නොවේ — දත්ත පමණක් වෙනස් වේ, එවිට සැසඳීම සෘජුයි.',
      },
      {
        id: 'radius',
        at: 3,
        titleSi: 'පරමාණුක අරය',
        titleEn: 'Atomic radius',
        captionSi:
          'රවුමේ තරම අරය පෙන්වයි. ආවර්තයක් දිගේ දකුණට යද්දී කුඩා වේ — ප්‍රෝටෝන වැඩි වුවත් කවචය එකමයි, එබැවින් Z_eff වැඩි වී ඉලෙක්ට්‍රෝන තදින් ඇදේ. කාණ්ඩයක් දිගේ පහළට යද්දී විශාල වේ — නව කවච එකතු වේ.',
        takeawaySi: 'දකුණට → කුඩා වේ · පහළට → විශාල වේ',
      },
      {
        id: 'ionisation',
        at: 10,
        titleSi: 'අයනීකරණ ශක්තිය',
        titleEn: 'Ionisation energy',
        captionSi:
          'දැන් වර්ණය තදබව අගය පෙන්වයි. දිශාව අරයට හරියටම විරුද්ධයි — කුඩා පරමාණුවක ඉලෙක්ට්‍රෝනය න්‍යෂ්ටියට ළං වී තදින් බැඳී ඇති නිසා ඉවත් කිරීමට වැඩි ශක්තියක් වුවමනා වේ.',
        takeawaySi: 'අරය කුඩා නම් අයනීකරණ ශක්තිය වැඩියි — එකම හේතුවේ අනෙක් පැත්ත.',
      },
      {
        id: 'affinity',
        at: 17,
        titleSi: 'ඉලෙක්ට්‍රෝන ලබා ගැනීමේ ශක්තිය',
        titleEn: 'Electron affinity',
        captionSi:
          'නැවතත් එකම දිශාව. හිස් තැනක් ඇති කුඩා පරමාණු ඉලෙක්ට්‍රෝනයක් තදින් ඇද ගනී. හිස්ව ඇති කොටු සලකන්න — කාණ්ඩ 2 සහ උච්ච ගෑස්වලට ප්‍රයෝජනවත් අගයක් නැත, මන්ද ඒවායේ උපකවච දැනටමත් පිරී ඇත.',
      },
      {
        id: 'electronegativity',
        at: 22,
        titleSi: 'විද්‍යුත්-සෘණතාව',
        titleEn: 'Electronegativity',
        captionSi:
          'බන්ධනයක ඉලෙක්ට්‍රෝන ඇද ගැනීමේ හැකියාව. F (3.98) උපරිමයයි — කුඩාම තරම සහ වැඩිම Z_eff එකට එන නිසා. උච්ච ගෑස්වලට අගයක් නැත, මන්ද ඒවා සාමාන්‍යයෙන් බන්ධන සාදන්නේ නැත.',
        takeawaySi: 'F > O > N ≈ Cl — වගුවේ ඉහළ දකුණු කෙළවර උපරිමයයි.',
      },
      {
        id: 'conclusion',
        at: 26,
        titleSi: 'එකම හේතුව',
        titleEn: 'One single cause',
        captionSi:
          'නැඹුරුතා හතරක් කටපාඩම් කිරීමට අවශ්‍ය නැත. Z_eff (ආවර්තයක් දිගේ වැඩි වේ) සහ කවච ගණන (කාණ්ඩයක් දිගේ වැඩි වේ) — මේ දෙකෙන් හතරම ව්‍යුත්පන්න කළ හැක.',
        takeawaySi:
          'අයනීකරණ ශක්තිය, ඉලෙක්ට්‍රෝන ලබා ගැනීමේ ශක්තිය, විද්‍යුත්-සෘණතාව එකම දිශාවට. අරය පමණක් විරුද්ධ දිශාවට.',
      },
    ],
  },
];

/** Index for id lookup. Built once — the catalogue is static. */
const byId = new Map(animationScenes.map((scene) => [scene.id, scene]));

export function getScene(id: string): AnimationScene | undefined {
  return byId.get(id);
}

/**
 * Resolves a lesson's animation ids to scenes, dropping unknown ids.
 *
 * Dropping rather than throwing is deliberate: content may name an animation
 * that has not been built yet, and a missing illustration must never stop a
 * student reading the lesson.
 */
export function scenesForLesson(animationIds: string[] | undefined): AnimationScene[] {
  if (!animationIds?.length) return [];
  return animationIds
    .map((id) => byId.get(id))
    .filter((scene): scene is AnimationScene => scene !== undefined);
}

/** Ids referenced by content but not yet implemented. Surfaced by the tests. */
export function missingSceneIds(animationIds: string[]): string[] {
  return animationIds.filter((id) => !byId.has(id));
}
