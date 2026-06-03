// ─── Translations — Gestiona tu Flotilla ──────────────────────────────────────

export type LangCode = 'es' | 'en' | 'pt' | 'fr' | 'de';

export const LANGUAGES: { code: LangCode; label: string; flag: string }[] = [
  { code: 'es', label: 'Español',   flag: '🇲🇽' },
  { code: 'en', label: 'English',   flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',   flag: '🇩🇪' },
];

export const T = {
  es: {
    nav: {
      features: 'Características', fleets: 'Flotillas', pricing: 'Precios',
      contact: 'Contacto', login: 'Iniciar sesión', start: 'Empezar gratis',
      startFull: 'Empezar gratis',
    },
    hero: {
      badge: '✦ Nuevo · Gestión inteligente de flotillas',
      h1a: 'Toda tu flotilla,', h1b: 'bajo un solo control.',
      sub: 'Gestiona vehículos, choferes, pagos, mantenimiento y GPS desde una sola plataforma. Para flotillas de plataforma y transporte.',
      cta1: 'Empezar 14 días gratis', cta2: 'Ver demo en vivo',
      trust1: 'Sin tarjeta', trust2: 'Soporte en español', trust3: 'Datos en México',
    },
    stats: {
      s1v: '5+', s1l: 'Empresas activas',
      s2v: '35+', s2l: 'Vehículos gestionados',
      s3v: '99.9%', s3l: 'Disponibilidad',
      s4v: '24/7', s4l: 'Soporte disponible',
    },
    features: {
      tag: 'Todo en uno',
      title: 'Todo lo que necesitas para gestionar tu flotilla',
      sub: 'Desde el vehículo hasta la cobranza, todo conectado. Sin hojas de Excel, sin WhatsApp caótico.',
      f1t: 'Control de vehículos', f1d: 'Registro completo de tu flota: documentos, pólizas, estado y kilometraje.',
      f2t: 'Gestión de choferes', f2d: 'Expedientes, licencias, contratos y comisiones de cada conductor.',
      f3t: 'Tesorería y pagos', f3d: 'Cobros semanales, adeudos, liquidaciones y flujo de caja en tiempo real.',
      f4t: 'Mantenimiento', f4d: 'Alertas preventivas, órdenes de servicio y costos por vehículo.',
      f5t: 'GPS y ubicación', f5d: 'Monitorea la ubicación de tu flotilla en tiempo real desde cualquier lugar.',
      f6t: 'Reportes inteligentes', f6d: 'Dashboards con KPIs, ingresos por unidad y exportación PDF/Excel.',
    },
    fleets: {
      tag: 'Para toda la industria',
      title: 'Diseñado para tu tipo de flotilla',
      p1title: 'Flotilla de Activos', p1sub: 'Uber, Didi, InDriver, Cabify, taxis',
      p1cta: 'Empezar con mi flota de plataforma',
      p2title: 'Flota de Transporte', p2sub: 'Carga, reparto, logística, camiones',
      p2cta: 'Empezar con mi flota de transporte',
    },
    how: {
      tag: 'Inicio rápido', title: 'En funcionamiento en menos de 30 minutos',
      s1t: 'Crea tu cuenta gratis', s1d: 'Regístrate en 2 minutos. Sin tarjeta, sin contratos. 14 días de prueba incluidos.',
      s2t: 'Agrega tu flotilla', s2d: 'Registra tus vehículos y choferes. Importa desde Excel o agrégalos uno a uno.',
      s3t: 'Controla todo', s3d: 'Gestiona pagos, mantenimiento, ubicación y reportes desde un solo panel.',
      cta: 'Crear mi cuenta gratis', sub: '14 días gratis · Sin tarjeta · Cancela cuando quieras',
    },
    testimonials: {
      tag: 'Testimonios', title: 'Lo que dicen nuestros clientes',
    },
    pricing: {
      tag: 'Precios claros', title: 'Un plan para cada tamaño de flotilla',
      sub: 'Desde $999 MXN/mes. Sin contratos. Cancela cuando quieras.',
      cta: 'Ver todos los planes y características',
      popular: 'MÁS POPULAR',
    },
    cta: {
      title: '¿Listo para transformar tu flotilla?',
      sub: 'Únete a las primeras empresas que ya gestionan su flotilla con Gestiona tu Flotilla.',
      cta1: 'Empezar gratis hoy', cta2: 'Ver demo en vivo',
      trust: '14 días gratis · Sin tarjeta · Soporte en español',
    },
    footer: {
      product: 'Producto', solutions: 'Soluciones', contact: 'Contacto',
      copy: '© 2026 Gestiona tu Flotilla · Hecho en México 🇲🇽',
      uptime: 'Soporte 24/7', support: 'Respuesta rápida', ssl: 'SSL seguro',
    },
  },

  en: {
    nav: {
      features: 'Features', fleets: 'Fleets', pricing: 'Pricing',
      contact: 'Contact', login: 'Sign in', start: 'Start free',
      startFull: 'Get started free',
    },
    hero: {
      badge: '✦ New · Intelligent fleet management',
      h1a: 'Your entire fleet,', h1b: 'under one control.',
      sub: 'Manage vehicles, drivers, payments, maintenance and GPS from a single platform. For rideshare and transport fleets.',
      cta1: 'Start 14-day free trial', cta2: 'See live demo',
      trust1: 'No credit card', trust2: 'Spanish & English support', trust3: 'Data in Mexico',
    },
    stats: {
      s1v: '5+', s1l: 'Active companies',
      s2v: '35+', s2l: 'Vehicles managed',
      s3v: '99.9%', s3l: 'Uptime',
      s4v: '24/7', s4l: 'Support available',
    },
    features: {
      tag: 'All in one',
      title: 'Everything you need to manage your fleet',
      sub: 'From vehicles to billing, all connected. No spreadsheets, no chaotic WhatsApp.',
      f1t: 'Vehicle control', f1d: 'Complete fleet registry: documents, policies, status and mileage.',
      f2t: 'Driver management', f2d: 'Files, licenses, contracts and commissions for each driver.',
      f3t: 'Treasury & payments', f3d: 'Weekly collections, debts, settlements and real-time cash flow.',
      f4t: 'Maintenance', f4d: 'Preventive alerts, service orders and costs per vehicle.',
      f5t: 'GPS & location', f5d: 'Monitor your fleet\'s location in real time from anywhere.',
      f6t: 'Smart reports', f6d: 'Dashboards with KPIs, income per unit and PDF/Excel export.',
    },
    fleets: {
      tag: 'For the whole industry',
      title: 'Designed for your fleet type',
      p1title: 'Rideshare Fleet', p1sub: 'Uber, Didi, InDriver, Cabify, taxis',
      p1cta: 'Start with my rideshare fleet',
      p2title: 'Transport Fleet', p2sub: 'Cargo, delivery, logistics, trucks',
      p2cta: 'Start with my transport fleet',
    },
    how: {
      tag: 'Quick start', title: 'Up and running in less than 30 minutes',
      s1t: 'Create your free account', s1d: 'Sign up in 2 minutes. No credit card, no contracts. 14-day trial included.',
      s2t: 'Add your fleet', s2d: 'Register your vehicles and drivers. Import from Excel or add them one by one.',
      s3t: 'Control everything', s3d: 'Manage payments, maintenance, location and reports from one panel.',
      cta: 'Create my free account', sub: '14 days free · No credit card · Cancel anytime',
    },
    testimonials: {
      tag: 'Testimonials', title: 'What our customers say',
    },
    pricing: {
      tag: 'Clear pricing', title: 'A plan for every fleet size',
      sub: 'From $999 MXN/month. No contracts. Cancel anytime.',
      cta: 'See all plans and features',
      popular: 'MOST POPULAR',
    },
    cta: {
      title: 'Ready to transform your fleet?',
      sub: 'Join the first companies already managing their fleet with Gestiona tu Flotilla.',
      cta1: 'Start free today', cta2: 'See live demo',
      trust: '14 days free · No credit card · Bilingual support',
    },
    footer: {
      product: 'Product', solutions: 'Solutions', contact: 'Contact',
      copy: '© 2026 Gestiona tu Flotilla · Made in Mexico 🇲🇽',
      uptime: '24/7 Support', support: 'Fast response', ssl: 'SSL secure',
    },
  },

  pt: {
    nav: {
      features: 'Recursos', fleets: 'Frotas', pricing: 'Preços',
      contact: 'Contato', login: 'Entrar', start: 'Começar grátis',
      startFull: 'Começar grátis',
    },
    hero: {
      badge: '✦ Novo · Gestão inteligente de frotas',
      h1a: 'Toda a sua frota,', h1b: 'sob um único controle.',
      sub: 'Gerencie veículos, motoristas, pagamentos, manutenção e GPS em uma única plataforma. Para frotas de aplicativo e transporte.',
      cta1: 'Começar 14 dias grátis', cta2: 'Ver demo ao vivo',
      trust1: 'Sem cartão', trust2: 'Suporte em português', trust3: 'Dados no México',
    },
    stats: {
      s1v: '5+', s1l: 'Empresas ativas',
      s2v: '35+', s2l: 'Veículos gerenciados',
      s3v: '99.9%', s3l: 'Disponibilidade',
      s4v: '24/7', s4l: 'Suporte disponível',
    },
    features: {
      tag: 'Tudo em um',
      title: 'Tudo que você precisa para gerenciar sua frota',
      sub: 'Do veículo ao faturamento, tudo conectado. Sem planilhas, sem WhatsApp caótico.',
      f1t: 'Controle de veículos', f1d: 'Registro completo da frota: documentos, apólices, status e quilometragem.',
      f2t: 'Gestão de motoristas', f2d: 'Fichas, habilitações, contratos e comissões de cada motorista.',
      f3t: 'Tesouraria e pagamentos', f3d: 'Cobranças semanais, débitos, liquidações e fluxo de caixa em tempo real.',
      f4t: 'Manutenção', f4d: 'Alertas preventivos, ordens de serviço e custos por veículo.',
      f5t: 'GPS e localização', f5d: 'Monitore a localização da sua frota em tempo real de qualquer lugar.',
      f6t: 'Relatórios inteligentes', f6d: 'Dashboards com KPIs, receita por unidade e exportação PDF/Excel.',
    },
    fleets: {
      tag: 'Para toda a indústria',
      title: 'Desenvolvido para o seu tipo de frota',
      p1title: 'Frota de Aplicativo', p1sub: 'Uber, 99, InDriver, Cabify, táxis',
      p1cta: 'Começar com minha frota de app',
      p2title: 'Frota de Transporte', p2sub: 'Carga, entrega, logística, caminhões',
      p2cta: 'Começar com minha frota de transporte',
    },
    how: {
      tag: 'Início rápido', title: 'Em funcionamento em menos de 30 minutos',
      s1t: 'Crie sua conta gratuita', s1d: 'Cadastre-se em 2 minutos. Sem cartão, sem contratos. 14 dias de teste incluídos.',
      s2t: 'Adicione sua frota', s2d: 'Registre seus veículos e motoristas. Importe do Excel ou adicione um por um.',
      s3t: 'Controle tudo', s3d: 'Gerencie pagamentos, manutenção, localização e relatórios em um único painel.',
      cta: 'Criar minha conta gratuita', sub: '14 dias grátis · Sem cartão · Cancele quando quiser',
    },
    testimonials: {
      tag: 'Depoimentos', title: 'O que nossos clientes dizem',
    },
    pricing: {
      tag: 'Preços claros', title: 'Um plano para cada tamanho de frota',
      sub: 'A partir de $999 MXN/mês. Sem contratos. Cancele quando quiser.',
      cta: 'Ver todos os planos e recursos',
      popular: 'MAIS POPULAR',
    },
    cta: {
      title: 'Pronto para transformar sua frota?',
      sub: 'Junte-se às primeiras empresas que já gerenciam sua frota com Gestiona tu Flotilla.',
      cta1: 'Começar grátis hoje', cta2: 'Ver demo ao vivo',
      trust: '14 dias grátis · Sem cartão · Suporte em português',
    },
    footer: {
      product: 'Produto', solutions: 'Soluções', contact: 'Contato',
      copy: '© 2026 Gestiona tu Flotilla · Feito no México 🇲🇽',
      uptime: 'Suporte 24/7', support: 'Resposta rápida', ssl: 'SSL seguro',
    },
  },

  fr: {
    nav: {
      features: 'Fonctionnalités', fleets: 'Flottes', pricing: 'Tarifs',
      contact: 'Contact', login: 'Se connecter', start: 'Commencer gratis',
      startFull: 'Commencer gratuitement',
    },
    hero: {
      badge: '✦ Nouveau · Gestion intelligente de flottes',
      h1a: 'Toute votre flotte,', h1b: 'sous un seul contrôle.',
      sub: 'Gérez véhicules, chauffeurs, paiements, maintenance et GPS depuis une seule plateforme. Pour les flottes de transport et de livraison.',
      cta1: 'Essai gratuit 14 jours', cta2: 'Voir la démo en direct',
      trust1: 'Sans carte bancaire', trust2: 'Support multilingue', trust3: 'Données au Mexique',
    },
    stats: {
      s1v: '5+', s1l: 'Entreprises actives',
      s2v: '35+', s2l: 'Véhicules gérés',
      s3v: '99.9%', s3l: 'Disponibilité',
      s4v: '24/7', s4l: 'Support disponible',
    },
    features: {
      tag: 'Tout en un',
      title: 'Tout ce dont vous avez besoin pour gérer votre flotte',
      sub: 'Du véhicule à la facturation, tout est connecté. Sans tableurs, sans WhatsApp chaotique.',
      f1t: 'Contrôle des véhicules', f1d: 'Registre complet de la flotte : documents, polices, état et kilométrage.',
      f2t: 'Gestion des chauffeurs', f2d: 'Dossiers, permis, contrats et commissions de chaque conducteur.',
      f3t: 'Trésorerie et paiements', f3d: 'Encaissements hebdomadaires, dettes, règlements et flux de trésorerie en temps réel.',
      f4t: 'Maintenance', f4d: 'Alertes préventives, ordres de service et coûts par véhicule.',
      f5t: 'GPS et localisation', f5d: 'Surveillez la localisation de votre flotte en temps réel depuis n\'importe où.',
      f6t: 'Rapports intelligents', f6d: 'Tableaux de bord avec KPIs, revenus par unité et export PDF/Excel.',
    },
    fleets: {
      tag: 'Pour toute l\'industrie',
      title: 'Conçu pour votre type de flotte',
      p1title: 'Flotte de covoiturage', p1sub: 'Uber, Didi, InDriver, Cabify, taxis',
      p1cta: 'Commencer avec ma flotte de covoiturage',
      p2title: 'Flotte de transport', p2sub: 'Fret, livraison, logistique, camions',
      p2cta: 'Commencer avec ma flotte de transport',
    },
    how: {
      tag: 'Démarrage rapide', title: 'Opérationnel en moins de 30 minutes',
      s1t: 'Créez votre compte gratuit', s1d: 'Inscrivez-vous en 2 minutes. Sans carte, sans contrat. 14 jours d\'essai inclus.',
      s2t: 'Ajoutez votre flotte', s2d: 'Enregistrez vos véhicules et chauffeurs. Importez depuis Excel ou ajoutez-les un par un.',
      s3t: 'Contrôlez tout', s3d: 'Gérez paiements, maintenance, localisation et rapports depuis un seul tableau de bord.',
      cta: 'Créer mon compte gratuit', sub: '14 jours gratuits · Sans carte · Annulez quand vous voulez',
    },
    testimonials: {
      tag: 'Témoignages', title: 'Ce que disent nos clients',
    },
    pricing: {
      tag: 'Tarifs clairs', title: 'Un plan pour chaque taille de flotte',
      sub: 'À partir de 999 MXN/mois. Sans contrat. Annulez quand vous voulez.',
      cta: 'Voir tous les plans et fonctionnalités',
      popular: 'LE PLUS POPULAIRE',
    },
    cta: {
      title: 'Prêt à transformer votre flotte ?',
      sub: 'Rejoignez les premières entreprises qui gèrent déjà leur flotte avec Gestiona tu Flotilla.',
      cta1: 'Commencer gratuitement', cta2: 'Voir la démo en direct',
      trust: '14 jours gratuits · Sans carte · Support multilingue',
    },
    footer: {
      product: 'Produit', solutions: 'Solutions', contact: 'Contact',
      copy: '© 2026 Gestiona tu Flotilla · Fait au Mexique 🇲🇽',
      uptime: 'Support 24/7', support: 'Réponse rapide', ssl: 'SSL sécurisé',
    },
  },

  de: {
    nav: {
      features: 'Funktionen', fleets: 'Flotten', pricing: 'Preise',
      contact: 'Kontakt', login: 'Anmelden', start: 'Kostenlos starten',
      startFull: 'Kostenlos starten',
    },
    hero: {
      badge: '✦ Neu · Intelligentes Flottenmanagement',
      h1a: 'Ihre gesamte Flotte,', h1b: 'unter einer Kontrolle.',
      sub: 'Verwalten Sie Fahrzeuge, Fahrer, Zahlungen, Wartung und GPS von einer einzigen Plattform. Für Ridesharing- und Transportflotten.',
      cta1: '14 Tage kostenlos testen', cta2: 'Live-Demo ansehen',
      trust1: 'Keine Kreditkarte', trust2: 'Mehrsprachiger Support', trust3: 'Daten in Mexiko',
    },
    stats: {
      s1v: '5+', s1l: 'Aktive Unternehmen',
      s2v: '35+', s2l: 'Verwaltete Fahrzeuge',
      s3v: '99.9%', s3l: 'Verfügbarkeit',
      s4v: '24/7', s4l: 'Support verfügbar',
    },
    features: {
      tag: 'Alles in einem',
      title: 'Alles, was Sie für Ihr Flottenmanagement brauchen',
      sub: 'Vom Fahrzeug bis zur Abrechnung – alles vernetzt. Keine Tabellen, kein chaotisches WhatsApp.',
      f1t: 'Fahrzeugkontrolle', f1d: 'Vollständiges Flottenregister: Dokumente, Versicherungen, Status und Kilometerstand.',
      f2t: 'Fahrerverwaltung', f2d: 'Akten, Führerscheine, Verträge und Provisionen für jeden Fahrer.',
      f3t: 'Finanzmanagement', f3d: 'Wöchentliche Einzüge, Schulden, Abrechnungen und Echtzeit-Cashflow.',
      f4t: 'Wartung', f4d: 'Präventivwarnungen, Serviceaufträge und Kosten pro Fahrzeug.',
      f5t: 'GPS & Standort', f5d: 'Überwachen Sie den Standort Ihrer Flotte in Echtzeit von überall.',
      f6t: 'Intelligente Berichte', f6d: 'Dashboards mit KPIs, Einnahmen pro Einheit und PDF/Excel-Export.',
    },
    fleets: {
      tag: 'Für die gesamte Branche',
      title: 'Entwickelt für Ihren Flottentyp',
      p1title: 'Ridesharing-Flotte', p1sub: 'Uber, Didi, InDriver, Cabify, Taxis',
      p1cta: 'Mit meiner Ridesharing-Flotte starten',
      p2title: 'Transportflotte', p2sub: 'Fracht, Lieferung, Logistik, LKW',
      p2cta: 'Mit meiner Transportflotte starten',
    },
    how: {
      tag: 'Schnellstart', title: 'In weniger als 30 Minuten betriebsbereit',
      s1t: 'Kostenloses Konto erstellen', s1d: 'Registrieren Sie sich in 2 Minuten. Ohne Kreditkarte, ohne Verträge. 14 Testtage inklusive.',
      s2t: 'Flotte hinzufügen', s2d: 'Fahrzeuge und Fahrer registrieren. Aus Excel importieren oder einzeln hinzufügen.',
      s3t: 'Alles kontrollieren', s3d: 'Zahlungen, Wartung, Standort und Berichte über ein einziges Dashboard verwalten.',
      cta: 'Mein kostenloses Konto erstellen', sub: '14 Tage kostenlos · Keine Kreditkarte · Jederzeit kündbar',
    },
    testimonials: {
      tag: 'Erfahrungsberichte', title: 'Was unsere Kunden sagen',
    },
    pricing: {
      tag: 'Transparente Preise', title: 'Ein Plan für jede Flottengröße',
      sub: 'Ab $999 MXN/Monat. Keine Verträge. Jederzeit kündbar.',
      cta: 'Alle Pläne und Funktionen ansehen',
      popular: 'AM BELIEBTESTEN',
    },
    cta: {
      title: 'Bereit, Ihre Flotte zu transformieren?',
      sub: 'Schließen Sie sich den ersten Unternehmen an, die ihre Flotte bereits verwalten.',
      cta1: 'Heute kostenlos starten', cta2: 'Live-Demo ansehen',
      trust: '14 Tage kostenlos · Keine Kreditkarte · Mehrsprachiger Support',
    },
    footer: {
      product: 'Produkt', solutions: 'Lösungen', contact: 'Kontakt',
      copy: '© 2026 Gestiona tu Flotilla · Hergestellt in Mexiko 🇲🇽',
      uptime: '24/7 Support', support: 'Schnelle Antwort', ssl: 'SSL gesichert',
    },
  },
} as const;

export type Translations = typeof T['es'];
