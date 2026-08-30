import type { TagCatalogData, TagRecord } from '../types';

type Seed = readonly [name: string, group: string, description?: string];

function title(name: string): string {
  return name.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function general(displayCategory: string, seeds: readonly Seed[], rankStart: number): TagRecord[] {
  return seeds.map(([canonicalName, group, description], index) => ({
    canonicalName,
    displayName: title(canonicalName),
    category: 'general',
    displayCategory,
    semanticGroups: [group],
    aliases: [canonicalName.replaceAll('_', ' ')],
    description: description ?? `${title(canonicalName)} is present in the image.`,
    usageRank: Math.max(1, rankStart - index),
  }));
}

const core: TagRecord[] = [
  { canonicalName: '1girl', displayName: '1 Girl', category: 'general', displayCategory: 'Subject', semanticGroups: ['subject-count', 'female-count'], aliases: ['one girl'], commonMisspellings: ['1 girl'], conflicts: ['2girls'], description: 'Exactly one girl is the primary subject.', usageRank: 1000 },
  { canonicalName: '1boy', displayName: '1 Boy', category: 'general', displayCategory: 'Subject', semanticGroups: ['subject-count', 'male-count'], aliases: ['one boy'], commonMisspellings: ['1 boy'], conflicts: ['2boys'], description: 'Exactly one boy is the primary subject.', usageRank: 990 },
  { canonicalName: '2girls', displayName: '2 Girls', category: 'general', displayCategory: 'Subject', semanticGroups: ['subject-count', 'female-count'], aliases: ['two girls'], commonMisspellings: ['2 girls'], conflicts: ['1girl', 'solo'], description: 'Two girls are present.', usageRank: 980 },
  { canonicalName: '2boys', displayName: '2 Boys', category: 'general', displayCategory: 'Subject', semanticGroups: ['subject-count', 'male-count'], aliases: ['two boys'], commonMisspellings: ['2 boys'], conflicts: ['1boy', 'solo'], description: 'Two boys are present.', usageRank: 970 },
  { canonicalName: 'solo', displayName: 'Solo', category: 'general', displayCategory: 'Subject', semanticGroups: ['subject-arrangement'], aliases: ['single subject'], conflicts: ['2girls', '2boys', 'group'], description: 'Only one main subject is shown.', usageRank: 960 },
  { canonicalName: 'group', displayName: 'Group', category: 'general', displayCategory: 'Subject', semanticGroups: ['subject-arrangement'], aliases: ['multiple people'], conflicts: ['solo'], description: 'Multiple subjects are shown together.', usageRank: 700 },
  { canonicalName: 'nami_(one_piece)', displayName: 'Nami', category: 'character', displayCategory: 'Character', semanticGroups: ['character'], aliases: ['nami', 'nami one piece'], commonMisspellings: ['nami one peice'], description: 'Nami from One Piece.', usageRank: 900, associations: { characterToCopyright: ['one_piece'] } },
  { canonicalName: 'one_piece', displayName: 'One Piece', category: 'copyright', displayCategory: 'Series', semanticGroups: ['copyright'], aliases: ['one piece'], commonMisspellings: ['one peice'], description: 'The One Piece series.', usageRank: 920 },
  { canonicalName: 'tifa_lockhart', displayName: 'Tifa Lockhart', category: 'character', displayCategory: 'Character', semanticGroups: ['character'], aliases: ['tifa', 'tifa lockhart'], description: 'Tifa Lockhart from Final Fantasy VII.', usageRank: 880, associations: { characterToCopyright: ['final_fantasy_vii'] } },
  { canonicalName: 'final_fantasy_vii', displayName: 'Final Fantasy VII', category: 'copyright', displayCategory: 'Series', semanticGroups: ['copyright'], aliases: ['final fantasy 7', 'final fantasy vii', 'ff7'], description: 'The Final Fantasy VII series.', usageRank: 850 },
  { canonicalName: 'frieren_(sousou_no_frieren)', displayName: 'Frieren', category: 'character', displayCategory: 'Character', semanticGroups: ['character'], aliases: ['frieren', 'frieren sousou no frieren'], commonMisspellings: ['freiren'], description: 'Frieren from Frieren: Beyond Journey’s End.', usageRank: 910, associations: { characterToCopyright: ['sousou_no_frieren'] } },
  { canonicalName: 'sousou_no_frieren', displayName: 'Sousou no Frieren', category: 'copyright', displayCategory: 'Series', semanticGroups: ['copyright'], aliases: ['sousou no frieren', 'frieren beyond journeys end'], commonMisspellings: ['sousou no freiren'], description: 'The Frieren: Beyond Journey’s End series.', usageRank: 890 },
  { canonicalName: 'blue_eyes', displayName: 'Blue Eyes', category: 'general', displayCategory: 'Appearance', semanticGroups: ['eye-color'], aliases: ['blue eyes'], commonMisspellings: ['blue eye', 'blue eys'], description: 'The subject has blue eyes.', usageRank: 940 },
  { canonicalName: 'black_hair', displayName: 'Black Hair', category: 'general', displayCategory: 'Hair', semanticGroups: ['hair-color'], aliases: ['black hair'], commonMisspellings: ['balck hair'], description: 'The subject has black hair.', usageRank: 930 },
  { canonicalName: 'full_body', displayName: 'Full Body', category: 'general', displayCategory: 'Framing', semanticGroups: ['framing'], aliases: ['full body'], conflicts: ['upper_body', 'portrait', 'close-up'], description: 'The subject is framed from head to feet.', usageRank: 900 },
  { canonicalName: 'upper_body', displayName: 'Upper Body', category: 'general', displayCategory: 'Framing', semanticGroups: ['framing'], aliases: ['upper body', 'waist up'], conflicts: ['full_body', 'close-up'], description: 'The frame emphasizes the subject’s upper body.', usageRank: 890 },
  { canonicalName: 'portrait', displayName: 'Portrait', category: 'general', displayCategory: 'Framing', semanticGroups: ['framing', 'portrait-oriented'], aliases: ['portrait framing'], conflicts: ['full_body'], description: 'A portrait-oriented view emphasizes the subject.', usageRank: 820 },
  { canonicalName: 'close-up', displayName: 'Close-up', category: 'general', displayCategory: 'Framing', semanticGroups: ['framing', 'portrait-oriented'], aliases: ['close up', 'closeup'], conflicts: ['full_body', 'upper_body'], description: 'The subject is framed very closely.', usageRank: 810 },
  { canonicalName: 'from_above', displayName: 'From Above', category: 'general', displayCategory: 'Viewpoint', semanticGroups: ['viewpoint'], aliases: ['from above', 'high angle'], conflicts: ['from_below', 'eye_level'], description: 'The camera looks down toward the subject.', usageRank: 800 },
  { canonicalName: 'from_below', displayName: 'From Below', category: 'general', displayCategory: 'Viewpoint', semanticGroups: ['viewpoint'], aliases: ['from below', 'low angle'], conflicts: ['from_above', 'eye_level'], description: 'The camera looks up toward the subject.', usageRank: 790 },
  { canonicalName: 'from_behind', displayName: 'From Behind', category: 'general', displayCategory: 'Viewpoint', semanticGroups: ['viewpoint-direction'], aliases: ['from behind', 'rear view'], conflicts: ['front_view'], description: 'The subject is viewed from behind.', usageRank: 780 },
  { canonicalName: 'pov', displayName: 'POV', category: 'general', displayCategory: 'Viewpoint', semanticGroups: ['viewpoint-mode'], aliases: ['point of view', 'first person view'], description: 'The composition uses a first-person point of view.', usageRank: 770 },
  { canonicalName: 'indoors', displayName: 'Indoors', category: 'general', displayCategory: 'Setting', semanticGroups: ['setting'], aliases: ['inside', 'indoor'], conflicts: ['outdoors'], description: 'The scene takes place indoors.', usageRank: 850 },
  { canonicalName: 'outdoors', displayName: 'Outdoors', category: 'general', displayCategory: 'Setting', semanticGroups: ['setting'], aliases: ['outside', 'outdoor'], conflicts: ['indoors'], description: 'The scene takes place outdoors.', usageRank: 860 },
  { canonicalName: 'reading', displayName: 'Reading', category: 'general', displayCategory: 'Action', semanticGroups: ['action'], aliases: ['read'], description: 'The subject is reading.', usageRank: 840 },
  { canonicalName: 'eating', displayName: 'Eating', category: 'general', displayCategory: 'Action', semanticGroups: ['action'], aliases: ['eat'], description: 'The subject is eating.', usageRank: 830 },
  { canonicalName: 'sandwich', displayName: 'Sandwich', category: 'general', displayCategory: 'Object', semanticGroups: ['object', 'food'], aliases: ['sandwiches'], description: 'A sandwich is visible.', usageRank: 720 },
  { canonicalName: 'exercising', displayName: 'Exercising', category: 'general', displayCategory: 'Action', semanticGroups: ['action'], aliases: ['exercise', 'working out'], description: 'The subject is exercising.', usageRank: 710 },
  { canonicalName: 'warm_lighting', displayName: 'Warm Lighting', category: 'general', displayCategory: 'Lighting', semanticGroups: ['lighting'], aliases: ['warm lighting', 'warm light'], commonMisspellings: ['warm ligting'], description: 'Warm-colored light illuminates the scene.', usageRank: 800 },
  { canonicalName: 'night', displayName: 'Night', category: 'general', displayCategory: 'Time', semanticGroups: ['time'], aliases: ['nighttime', 'at night'], conflicts: ['day'], description: 'The scene takes place at night.', usageRank: 820 },
  { canonicalName: 'old_fullbody', displayName: 'Old Fullbody', category: 'general', displayCategory: 'Framing', semanticGroups: ['framing'], aliases: [], description: 'A retired spelling for full-body framing.', usageRank: 1, deprecated: true, replacement: 'full_body' },
];

const appearance = general('Appearance', [
  ['green_eyes', 'eye-color'], ['brown_eyes', 'eye-color'], ['red_eyes', 'eye-color'], ['purple_eyes', 'eye-color'], ['golden_eyes', 'eye-color'], ['heterochromia', 'eye-feature'], ['freckles', 'skin-detail'], ['tan', 'skin-tone'], ['dark_skin', 'skin-tone'], ['pale_skin', 'skin-tone'], ['glasses', 'accessory'], ['sunglasses', 'accessory'], ['earrings', 'accessory'], ['necklace', 'accessory'], ['bracelet', 'accessory'], ['scar', 'skin-detail'], ['tattoo', 'skin-detail'], ['pointy_ears', 'ear-shape'], ['animal_ears', 'ear-shape'], ['cat_ears', 'ear-shape'], ['fox_ears', 'ear-shape'], ['wings', 'body-feature'], ['angel_wings', 'wing-type'], ['tail', 'body-feature'], ['cat_tail', 'tail-type'], ['slim', 'body-build'], ['athletic', 'body-build'], ['tall', 'height'], ['short', 'height'], ['looking_at_viewer', 'gaze'], ['looking_away', 'gaze'], ['closed_eyes', 'eye-state'],
], 690);

const hair = general('Hair', [
  ['blonde_hair', 'hair-color'], ['brown_hair', 'hair-color'], ['red_hair', 'hair-color'], ['blue_hair', 'hair-color'], ['green_hair', 'hair-color'], ['purple_hair', 'hair-color'], ['pink_hair', 'hair-color'], ['white_hair', 'hair-color'], ['grey_hair', 'hair-color'], ['multicolored_hair', 'hair-color'], ['long_hair', 'hair-length'], ['short_hair', 'hair-length'], ['medium_hair', 'hair-length'], ['very_long_hair', 'hair-length'], ['ponytail', 'hairstyle'], ['twintails', 'hairstyle'], ['braid', 'hairstyle'], ['single_braid', 'hairstyle'], ['twin_braids', 'hairstyle'], ['bob_cut', 'hairstyle'], ['messy_hair', 'hairstyle'], ['curly_hair', 'hair-texture'], ['wavy_hair', 'hair-texture'], ['straight_hair', 'hair-texture'], ['bangs', 'hair-detail'], ['hair_over_one_eye', 'hair-detail'], ['ahoge', 'hair-detail'], ['hair_ribbon', 'hair-accessory'], ['hair_ornament', 'hair-accessory'], ['flower_in_hair', 'hair-accessory'],
], 680);

const clothing = general('Clothing', [
  ['dress', 'clothing-type'], ['shirt', 'clothing-type'], ['t-shirt', 'clothing-type'], ['blouse', 'clothing-type'], ['sweater', 'clothing-type'], ['hoodie', 'clothing-type'], ['jacket', 'clothing-type'], ['coat', 'clothing-type'], ['suit', 'clothing-type'], ['school_uniform', 'outfit'], ['sailor_collar', 'clothing-detail'], ['skirt', 'clothing-type'], ['pleated_skirt', 'clothing-type'], ['shorts', 'clothing-type'], ['pants', 'clothing-type'], ['jeans', 'clothing-type'], ['leggings', 'clothing-type'], ['stockings', 'legwear'], ['thighhighs', 'legwear'], ['kneehighs', 'legwear'], ['socks', 'legwear'], ['boots', 'footwear'], ['shoes', 'footwear'], ['sneakers', 'footwear'], ['sandals', 'footwear'], ['hat', 'headwear'], ['cap', 'headwear'], ['beret', 'headwear'], ['scarf', 'clothing-accessory'], ['gloves', 'clothing-accessory'], ['belt', 'clothing-accessory'], ['bowtie', 'neckwear'], ['necktie', 'neckwear'], ['red_dress', 'outfit-color'], ['black_dress', 'outfit-color'], ['white_shirt', 'outfit-color'], ['blue_skirt', 'outfit-color'], ['layered_clothing', 'clothing-style'],
], 650);

const expressions = general('Expression', [
  ['smile', 'expression'], ['grin', 'expression'], ['laughing', 'expression'], ['open_mouth', 'mouth-state'], ['closed_mouth', 'mouth-state'], ['blush', 'expression-detail'], ['angry', 'expression'], ['sad', 'expression'], ['crying', 'expression'], ['surprised', 'expression'], ['confused', 'expression'], ['embarrassed', 'expression'], ['serious', 'expression'], ['determined', 'expression'], ['sleepy', 'expression'], ['wink', 'eye-expression'], ['frown', 'expression'], ['smirk', 'expression'], ['tears', 'expression-detail'], ['excited', 'expression'], ['gentle_smile', 'expression'], ['expressionless', 'expression'],
], 760);

const actions = general('Action', [
  ['walking', 'action'], ['running', 'action'], ['jumping', 'action'], ['dancing', 'action'], ['singing', 'action'], ['sleeping', 'action'], ['sitting', 'pose'], ['standing', 'pose'], ['kneeling', 'pose'], ['lying', 'pose'], ['cooking', 'action'], ['drinking', 'action'], ['writing', 'action'], ['drawing', 'action'], ['painting', 'action'], ['studying', 'action'], ['working', 'action'], ['gardening', 'action'], ['shopping', 'action'], ['driving', 'action'], ['cycling', 'action'], ['swimming', 'action'], ['hiking', 'action'], ['fishing', 'action'], ['playing_guitar', 'action'], ['playing_piano', 'action'], ['taking_photo', 'action'], ['holding', 'action'], ['reaching', 'action'], ['waving', 'gesture'], ['pointing', 'gesture'], ['clapping', 'gesture'], ['hugging', 'action'], ['talking', 'action'], ['listening', 'action'],
], 740);

const poses = general('Pose', [
  ['arms_crossed', 'arm-pose'], ['arms_up', 'arm-pose'], ['hands_on_hips', 'arm-pose'], ['hand_on_chin', 'arm-pose'], ['hand_in_hair', 'arm-pose'], ['hands_in_pockets', 'arm-pose'], ['one_hand_up', 'arm-pose'], ['peace_sign', 'gesture'], ['thumbs_up', 'gesture'], ['crossed_legs', 'leg-pose'], ['legs_together', 'leg-pose'], ['leaning_forward', 'body-pose'], ['leaning_back', 'body-pose'], ['looking_back', 'body-pose'], ['turning_around', 'body-pose'], ['dynamic_pose', 'pose-style'], ['action_pose', 'pose-style'], ['contrapposto', 'pose-style'], ['head_tilt', 'head-pose'], ['from_side', 'viewpoint-direction'],
], 620);

const objects = general('Object', [
  ['book', 'object'], ['phone', 'object'], ['camera', 'object'], ['umbrella', 'object'], ['bag', 'object'], ['backpack', 'object'], ['cup', 'object'], ['coffee', 'drink'], ['tea', 'drink'], ['bottle', 'object'], ['plate', 'object'], ['cake', 'food'], ['bread', 'food'], ['apple', 'food'], ['fruit', 'food'], ['flower', 'object'], ['bouquet', 'object'], ['sword', 'object'], ['staff', 'object'], ['laptop', 'object'], ['computer', 'object'], ['headphones', 'object'], ['musical_instrument', 'object'], ['guitar', 'object'], ['piano', 'object'], ['bicycle', 'vehicle'], ['car', 'vehicle'], ['train', 'vehicle'], ['chair', 'furniture'], ['table', 'furniture'], ['lamp', 'object'], ['candle', 'object'], ['mirror', 'object'], ['clock', 'object'],
], 610);

const composition = general('Composition', [
  ['eye_level', 'viewpoint'], ['front_view', 'viewpoint-direction'], ['side_view', 'viewpoint-direction'], ['three-quarter_view', 'viewpoint-direction'], ['wide_shot', 'framing'], ['medium_shot', 'framing'], ['cowboy_shot', 'framing'], ['headshot', 'framing'], ['dutch_angle', 'camera-angle'], ['fisheye', 'lens'], ['depth_of_field', 'focus'], ['blurry_background', 'focus'], ['bokeh', 'focus'], ['centered', 'composition'], ['symmetrical_composition', 'composition'], ['rule_of_thirds', 'composition'], ['negative_space', 'composition'], ['multiple_views', 'composition'], ['panorama', 'composition'], ['profile', 'viewpoint-direction'], ['over_shoulder', 'viewpoint-mode'],
], 700);

const environments = general('Setting', [
  ['library', 'setting'], ['bedroom', 'setting'], ['kitchen', 'setting'], ['classroom', 'setting'], ['office', 'setting'], ['cafe', 'setting'], ['restaurant', 'setting'], ['shop', 'setting'], ['gym', 'setting'], ['museum', 'setting'], ['studio', 'setting'], ['hallway', 'setting'], ['balcony', 'setting'], ['rooftop', 'setting'], ['street', 'setting'], ['city', 'setting'], ['village', 'setting'], ['park', 'setting'], ['garden', 'setting'], ['forest', 'setting'], ['beach', 'setting'], ['ocean', 'setting'], ['mountain', 'setting'], ['field', 'setting'], ['river', 'setting'], ['lake', 'setting'], ['snow', 'weather'], ['rain', 'weather'], ['cloudy', 'weather'], ['sky', 'setting-detail'], ['space', 'setting'], ['ruins', 'setting'], ['castle', 'setting'], ['fantasy_world', 'setting'],
], 690);

const lightTime = general('Lighting', [
  ['day', 'time'], ['morning', 'time'], ['afternoon', 'time'], ['evening', 'time'], ['sunset', 'time'], ['sunrise', 'time'], ['twilight', 'time'], ['golden_hour', 'time'], ['blue_hour', 'time'], ['bright_lighting', 'lighting'], ['soft_lighting', 'lighting'], ['dramatic_lighting', 'lighting'], ['cinematic_lighting', 'lighting'], ['rim_lighting', 'lighting'], ['backlighting', 'lighting'], ['side_lighting', 'lighting'], ['natural_lighting', 'lighting'], ['studio_lighting', 'lighting'], ['neon_lighting', 'lighting'], ['moonlight', 'lighting'], ['sunlight', 'lighting'], ['dappled_light', 'lighting'], ['volumetric_lighting', 'lighting'], ['god_rays', 'lighting'], ['shadows', 'lighting-detail'], ['high_contrast', 'lighting-style'], ['low_contrast', 'lighting-style'],
], 730);

const qualityMeta: TagRecord[] = general('Quality / Meta', [
  ['masterpiece', 'quality'], ['best_quality', 'quality'], ['high_quality', 'quality'], ['amazing_quality', 'quality'], ['very_aesthetic', 'aesthetic'], ['detailed', 'detail'], ['highly_detailed', 'detail'], ['sharp_focus', 'focus'], ['illustration', 'medium'], ['digital_art', 'medium'], ['watercolor', 'medium'], ['oil_painting', 'medium'], ['sketch', 'medium'], ['lineart', 'medium'], ['anime_coloring', 'style'], ['realistic', 'style'], ['photorealistic', 'style'], ['monochrome', 'color-style'], ['greyscale', 'color-style'], ['limited_palette', 'color-style'],
], 780).map((record) => ({ ...record, category: 'meta' as const }));

const records = [...core, ...appearance, ...hair, ...clothing, ...expressions, ...actions, ...poses, ...objects, ...composition, ...environments, ...lightTime, ...qualityMeta];
if (records.length < 200 || records.length > 500) throw new Error(`Development catalog record count ${records.length} is outside its documented scope.`);

export const WAI_DEVELOPMENT_CATALOG: TagCatalogData = {
  schema: 'zynalo.prompt-catalog/v1',
  id: 'zynalo-wai-development',
  version: '1.0.0',
  records,
};

export const WAI_DEVELOPMENT_CATALOG_RECORD_COUNT = records.length;
