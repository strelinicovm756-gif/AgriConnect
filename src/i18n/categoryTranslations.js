export const categoryTranslations = {
  // ── Categories (by slug) ─────────────────────────
  categories: {
    'vegetables':             { ro: 'Legume',                  en: 'Vegetables',             fr: 'Légumes' },
    'fruit':                  { ro: 'Fructe',                   en: 'Fruits',                 fr: 'Fruits' },
    'dairy':                  { ro: 'Lactate',                  en: 'Dairy',                  fr: 'Produits laitiers' },
    'meat':                   { ro: 'Carne',                    en: 'Meat',                   fr: 'Viande' },
    'eggs':                   { ro: 'Ouă',                      en: 'Eggs',                   fr: 'Œufs' },
    'grains / cereals':       { ro: 'Cereale',                  en: 'Cereals',                fr: 'Céréales' },
    'field-services':         { ro: 'Servicii Agricole',        en: 'Land Services',          fr: 'Services Agricoles' },
    'logistics--transport':   { ro: 'Logistică & Transport',    en: 'Logistics & Transport',  fr: 'Logistique & Transport' },
    'equipment-rentals':      { ro: 'Închiriere Utilaje',       en: 'Equipment Rentals',      fr: 'Location d\'équipements' },
  },

  // ── Subcategories (by slug) ──────────────────────
  subcategories: {
    // Vegetables
    'rosii':              { ro: 'Roșii',                    en: 'Tomatoes',                     fr: 'Tomates' },
    'cartofi':            { ro: 'Cartofi',                  en: 'Potatoes',                     fr: 'Pommes de terre' },
    'ceapa':              { ro: 'Ceapă',                    en: 'Onions',                       fr: 'Oignons' },
    'morcovi':            { ro: 'Morcovi',                  en: 'Carrots',                      fr: 'Carottes' },
    'castraveti':         { ro: 'Castraveți',               en: 'Cucumbers',                    fr: 'Concombres' },
    'varza':              { ro: 'Varză',                    en: 'Cabbage',                      fr: 'Chou' },
    'ardei':              { ro: 'Ardei',                    en: 'Peppers',                      fr: 'Poivrons' },
    'dovlecei':           { ro: 'Dovlecei',                 en: 'Zucchini',                     fr: 'Courgettes' },
    'usturoi':            { ro: 'Usturoi',                  en: 'Garlic',                       fr: 'Ail' },
    'alte-legume':        { ro: 'Alte legume',              en: 'Other vegetables',             fr: 'Autres légumes' },
    // Fruits
    'mere':               { ro: 'Mere',                     en: 'Apples',                       fr: 'Pommes' },
    'pere':               { ro: 'Pere',                     en: 'Pears',                        fr: 'Poires' },
    'struguri':           { ro: 'Struguri',                 en: 'Grapes',                       fr: 'Raisins' },
    'prune':              { ro: 'Prune',                    en: 'Plums',                        fr: 'Prunes' },
    'capsuni':            { ro: 'Căpșuni',                  en: 'Strawberries',                 fr: 'Fraises' },
    'cirese-visine':      { ro: 'Cireșe & Vișine',         en: 'Cherries & Sour cherries',     fr: 'Cerises & Griottes' },
    'fructe-padure':      { ro: 'Fructe de pădure',        en: 'Forest fruits',                fr: 'Fruits des bois' },
    'alte-fructe':        { ro: 'Alte fructe',              en: 'Other fruits',                 fr: 'Autres fruits' },
    // Dairy
    'lapte':              { ro: 'Lapte',                    en: 'Milk',                         fr: 'Lait' },
    'branzeturi':         { ro: 'Brânzeturi',               en: 'Cheeses',                      fr: 'Fromages' },
    'smantana':           { ro: 'Smântână',                 en: 'Sour cream',                   fr: 'Crème fraîche' },
    'unt':                { ro: 'Unt',                      en: 'Butter',                       fr: 'Beurre' },
    'iaurt':              { ro: 'Iaurt',                    en: 'Yogurt',                       fr: 'Yaourt' },
    'alte-lactate':       { ro: 'Alte lactate',             en: 'Other dairy',                  fr: 'Autres produits laitiers' },
    // Meat
    'pork':               { ro: 'Carne de porc',            en: 'Pork',                         fr: 'Porc' },
    'beef':               { ro: 'Carne de vită',            en: 'Beef',                         fr: 'Bœuf' },
    'chicken':            { ro: 'Carne de pui',             en: 'Chicken',                      fr: 'Poulet' },
    'lamb':               { ro: 'Carne de miel',            en: 'Lamb',                         fr: 'Agneau' },
    'carne-porc':         { ro: 'Carne de porc',            en: 'Pork',                         fr: 'Porc' },
    'carne-vita':         { ro: 'Carne de vită',            en: 'Beef',                         fr: 'Bœuf' },
    'carne-pasare':       { ro: 'Carne de pasăre',          en: 'Poultry',                      fr: 'Volaille' },
    'miel-capra':         { ro: 'Miel & Capră',             en: 'Lamb & Goat',                  fr: 'Agneau & Chèvre' },
    'mezeluri':           { ro: 'Mezeluri artizanale',      en: 'Artisan deli meats',           fr: 'Charcuterie artisanale' },
    'alte-tipuri-carne':  { ro: 'Alte tipuri de carne',     en: 'Other meat types',             fr: 'Autres types de viande' },
    // Eggs
    'oua-gaina':          { ro: 'Ouă de găină',             en: 'Chicken eggs',                 fr: 'Œufs de poule' },
    'oua-rata':           { ro: 'Ouă de rață',              en: 'Duck eggs',                    fr: 'Œufs de canard' },
    'oua-prepelita':      { ro: 'Ouă de prepeliță',         en: 'Quail eggs',                   fr: 'Œufs de caille' },
    'alte-oua':           { ro: 'Alte ouă',                 en: 'Other eggs',                   fr: 'Autres œufs' },
    // Cereals
    'grau':               { ro: 'Grâu',                     en: 'Wheat',                        fr: 'Blé' },
    'porumb':             { ro: 'Porumb',                   en: 'Corn',                         fr: 'Maïs' },
    'floarea-soarelui':   { ro: 'Floarea-soarelui',         en: 'Sunflower',                    fr: 'Tournesol' },
    'orz':                { ro: 'Orz',                      en: 'Barley',                       fr: 'Orge' },
    'ovaz':               { ro: 'Ovăz',                     en: 'Oats',                         fr: 'Avoine' },
    'soia':               { ro: 'Soia',                     en: 'Soy',                          fr: 'Soja' },
    'alte-cereale':       { ro: 'Alte cereale',             en: 'Other cereals',                fr: 'Autres céréales' },
    // Land Services
    'arat-prelucrare':    { ro: 'Arat & Pregătire sol',     en: 'Plowing & Soil preparation',   fr: 'Labourage & Préparation du sol' },
    'arat':               { ro: 'Arat',                     en: 'Plowing',                      fr: 'Labourage' },
    'semanat':            { ro: 'Semănat',                  en: 'Seeding',                      fr: 'Semis' },
    'fertilizare':        { ro: 'Fertilizare',              en: 'Fertilization',                fr: 'Fertilisation' },
    'recoltare':          { ro: 'Recoltare',                en: 'Harvesting',                   fr: 'Récolte' },
    'irigare':            { ro: 'Irigare',                  en: 'Irrigation',                   fr: 'Irrigation' },
    'transport-agricol':  { ro: 'Transport agricol',        en: 'Agricultural transport',       fr: 'Transport agricole' },
    'arenda-teren':       { ro: 'Arendă teren',             en: 'Land lease',                   fr: 'Location de terrain' },
    'alte-servicii':      { ro: 'Alte servicii',            en: 'Other services',               fr: 'Autres services' },
    // Logistics
    'bulk-freight-transport':  { ro: 'Transport marfă vrac',  en: 'Bulk Freight Transport',     fr: 'Transport de marchandises en vrac' },
    'home-delivery':           { ro: 'Livrare la domiciliu',  en: 'Home Delivery',              fr: 'Livraison à domicile' },
    'local-courier-services':  { ro: 'Curierat local',        en: 'Local Courier Services',     fr: 'Services de courrier local' },
    'livestock-transport':     { ro: 'Transport animale',     en: 'Livestock Transport',        fr: 'Transport de bétail' },
    // Equipment
    'tractors--attachments':   { ro: 'Tractoare & Accesorii', en: 'Tractors & Attachments',    fr: 'Tracteurs & Accessoires' },
    'small-machinery--tools':  { ro: 'Utilaje mici & Scule',  en: 'Small Machinery & Tools',   fr: 'Petites machines & Outils' },
    'trailers--platforms':     { ro: 'Remorci & Platforme',   en: 'Trailers & Platforms',      fr: 'Remorques & Plateformes' },
  },
};

// Helper function — use this everywhere in the app
export function getCategoryName(slug, lang = 'ro') {
  return categoryTranslations.categories[slug]?.[lang] ?? slug;
}

export function getSubcategoryName(slug, lang = 'ro') {
  return categoryTranslations.subcategories[slug]?.[lang] ?? slug;
}
