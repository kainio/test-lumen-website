import type { CookieConsentConfig } from 'vanilla-cookieconsent';

export const config: CookieConsentConfig = {
    guiOptions: {
        consentModal: {
            layout: 'box',
            position: 'bottom right',
            equalWeightButtons: true,
            flipButtons: false
        },
        preferencesModal: {
            layout: 'box',
            position: 'left',
            equalWeightButtons: true,
            flipButtons: false
        }
    },
    categories: {
        necessary: {
            readOnly: true
        },
        analytics: {
            autoClear: {
                cookies: [
                    {
                        name: /^(_ga|_gid)/ // ga: analytics
                    }
                ]
            }
        },
        ads: {}
    },
    language: {
        default: 'en',
        autoDetect: 'browser',
        translations: {
            en: {
                consentModal: {
                    title: 'Hello traveler, it\'s cookie time!',
                    description: 'Our website uses essential cookies to ensure its proper operation and tracking cookies to understand how you interact with it. The latter will be set only after consent.',
                    acceptAllBtn: 'Accept all',
                    acceptNecessaryBtn: 'Reject all',
                    showPreferencesBtn: 'Manage preferences',
                    footer: '<a href="{{privacy_url}}">Privacy Policy</a>\n<a href="{{terms_url}}">Terms and conditions</a>'
                },
                preferencesModal: {
                    title: 'Cookie preferences',
                    acceptAllBtn: 'Accept all',
                    acceptNecessaryBtn: 'Reject all',
                    savePreferencesBtn: 'Save preferences',
                    closeIconLabel: 'Close modal',
                    serviceCounterLabel: 'Service|Services',
                    sections: [
                        {
                            title: 'Cookie usage 📢',
                            description: 'I use cookies to ensure the basic functionalities of the website and to enhance your online experience. You can choose for each category to opt-in/out whenever you want. For more details relative to cookies and other sensitive data, please read the full <a href="{{privacy_url}}" class="cc-link">privacy policy</a>.'
                        },
                        {
                            title: 'Strictly necessary cookies',
                            description: 'These cookies are essential for the proper functioning of my website. Without these cookies, the website would not work properly',
                            linkedCategory: 'necessary'
                        },
                        {
                            title: 'Performance and Analytics cookies',
                            description: 'These cookies allow the website to remember the choices you have made in the past',
                            linkedCategory: 'analytics'
                        },
                        {
                            title: 'Advertisement and Targeting cookies',
                            description: 'These cookies are used to make advertising messages more relevant to you. They perform functions like preventing the same ad from continuously reappearing, ensuring that ads are properly displayed for advertisers, and in some cases selecting advertisements that are based on your interests.',
                            linkedCategory: 'ads'
                        },
                        {
                            title: 'More information',
                            description: 'For any queries in relation to our policy on cookies and your choices, please <a class="cc-link" href="#yourcontactpage">contact us</a>.',
                        }
                    ]
                }
            },
            fr: {
                consentModal: {
                    title: 'Bonjour voyageur, c\'est l\'heure des cookies !',
                    description: 'Notre site web utilise des cookies essentiels pour assurer son bon fonctionnement et des cookies de suivi pour comprendre comment vous interagissez avec lui.',
                    acceptAllBtn: 'Tout accepter',
                    acceptNecessaryBtn: 'Tout refuser',
                    showPreferencesBtn: 'Gérer les préférences',
                    footer: '<a href="{{privacy_url}}">Politique de confidentialité</a>\n<a href="{{terms_url}}">Conditions d\'utilisation</a>'
                },
                preferencesModal: {
                    title: 'Préférences cookies',
                    acceptAllBtn: 'Tout accepter',
                    acceptNecessaryBtn: 'Tout refuser',
                    savePreferencesBtn: 'Enregistrer les préférences',
                    closeIconLabel: 'Fermer',
                    sections: [
                        {
                            title: 'Utilisation des cookies 📢',
                            description: 'Nous utilisons des cookies pour assurer les fonctionnalités de base du site.'
                        },
                        {
                            title: 'Cookies strictement nécessaires',
                            description: 'Ces cookies sont essentiels au bon fonctionnement du site.',
                            linkedCategory: 'necessary'
                        },
                        {
                            title: 'Cookies de performance et d\'analyse',
                            description: 'Ces cookies nous permettent d\'analyser l\'utilisation du site.',
                            linkedCategory: 'analytics'
                        }
                    ]
                }
            },
            es: {
                consentModal: {
                    title: '¡Hola viajero, es hora de las cookies!',
                    description: 'Nuestro sitio web utiliza cookies esenciales para garantizar su correcto funcionamiento y cookies de seguimiento para entender cómo interactúas con él.',
                    acceptAllBtn: 'Aceptar todo',
                    acceptNecessaryBtn: 'Rechazar todo',
                    showPreferencesBtn: 'Gestionar preferencias',
                    footer: '<a href="{{privacy_url}}">Política de privacidad</a>\n<a href="{{terms_url}}">Términos y condiciones</a>'
                },
                preferencesModal: {
                    title: 'Preferencias de cookies',
                    acceptAllBtn: 'Aceptar todo',
                    acceptNecessaryBtn: 'Rechazar todo',
                    savePreferencesBtn: 'Guardar preferencias',
                    closeIconLabel: 'Cerrar',
                    sections: [
                        {
                            title: 'Uso de cookies 📢',
                            description: 'Utilizamos cookies para asegurar las funcionalidades básicas del sitio.'
                        },
                        {
                            title: 'Cookies estrictamente necesarias',
                            description: 'Estas cookies son esenciales para el correcto funcionamiento del sitio.',
                            linkedCategory: 'necessary'
                        }
                    ]
                }
            },
            ar: {
                consentModal: {
                    title: 'مرحباً أيها المسافر، حان وقت الكوكيز!',
                    description: 'يستخدم موقعنا ملفات تعريف الارتباط الأساسية لضمان تشغيله بشكل صحيح وملفات تعريف الارتباط للتتبع لفهم كيفية تفاعلك معه.',
                    acceptAllBtn: 'قبول الكل',
                    acceptNecessaryBtn: 'رفض الكل',
                    showPreferencesBtn: 'إدارة التفضيلات',
                    footer: '<a href="{{privacy_url}}">سياسة الخصوصية</a>\n<a href="{{terms_url}}">الشروط والأحكام</a>'
                },
                preferencesModal: {
                    title: 'تفضيلات ملفات تعريف الارتباط',
                    acceptAllBtn: 'قبول الكل',
                    acceptNecessaryBtn: 'رفض الكل',
                    savePreferencesBtn: 'حفظ التفضيلات',
                    closeIconLabel: 'إغلاق',
                    sections: [
                        {
                            title: 'استخدام ملفات تعريف الارتباط 📢',
                            description: 'نحن نستخدم ملفات تعريف الارتباط لضمان الوظائف الأساسية للموقع.'
                        }
                    ]
                }
            }
        }
    }
};
