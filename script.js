// Tables et endpoints utilises pour synchroniser le site avec Supabase/Netlify.
const ORDERS_TABLE = "orders";
const CONTACT_MESSAGES_TABLE = "contact_messages";
const NEWSLETTER_TABLE = "newsletter_subscribers";
const PRODUCTS_TABLE = "products";
const COLLECTIONS_TABLE = "collections";
const VIDEOS_TABLE = "site_videos";
const INCOMING_PRODUCTS_TABLE = "incoming_products";
const WAVE_PAYMENTS_TABLE = "wave_payments";
const ABANDONED_CHECKOUTS_TABLE = "abandoned_checkouts";
const SITE_UPDATES_TABLE = "site_updates";
const API_BASE = "/.netlify/functions/api";
const SUPABASE_URL = "https://mwbmzwohtisnpjayejkw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tSdbg0by8DZH635tdZdV9Q_OrHMvm5r";
const SUPABASE_CONFIG_STORAGE_KEY = "redemption_supabase_config";
const PUBLIC_TABLE_CACHE_PREFIX = "redemption_public_table_cache:";
const PUBLIC_TABLE_CACHE_TTL = 2 * 60 * 1000;
const WAVE_PAYMENT_URL = "https://pay.wave.com/m/M_ci_Qvc5tZTR0mJN/c/ci/";

// Point d'entree principal : toute la logique du site demarre apres chargement du DOM.
document.addEventListener("DOMContentLoaded", () => {
            // References DOM principales : navigation, panier, commande, formulaires et grilles.
            const loader = document.getElementById("loader");
            const navbar = document.getElementById("navbar");
            const hamburger = document.getElementById("hamburger");
            const mobileMenu = document.getElementById("mobileMenu");
            const cartBtn = document.getElementById("cartBtn");
            const installAppBtn = document.getElementById("installAppBtn");
            const notifyBtn = document.getElementById("notifyBtn");
            const installHelpModal = document.getElementById("installHelpModal");
            const installHelpClose = document.getElementById("installHelpClose");
            const installHelpDone = document.getElementById("installHelpDone");
            const installHelpTitle = document.getElementById("installHelpTitle");
            const installHelpSteps = installHelpModal?.querySelector("ol");
            const installHelpNote = document.getElementById("installHelpNote");
            const updateAppBtn = document.getElementById("updateAppBtn");
            const cartSidebar = document.getElementById("cartSidebar");
            const cartOverlay = document.getElementById("cartOverlay");
            const cartClose = document.getElementById("cartClose");
            const cartItems = document.getElementById("cartItems");
            const cartFooter = document.getElementById("cartFooter");
            const cartCount = document.getElementById("cartCount");
            const cartTotal = document.getElementById("cartTotal");
            const orderModal = document.getElementById("orderModal");
            const modalClose = document.getElementById("modalClose");
            const orderPanel = document.getElementById("orderPanel");
            const orderSuccess = document.getElementById("orderSuccess");
            const successClose = document.getElementById("successClose");
            const orderSummary = document.getElementById("orderSummary");
            const deliveryMapPanel = document.getElementById("deliveryMapPanel");
            const deliveryMapFrame = document.getElementById("deliveryMapFrame");
            const deliveryMapStatus = document.getElementById("deliveryMapStatus");
            const deliveryCoordinates = document.getElementById("deliveryCoordinates");
            const useCurrentLocationBtn = document.getElementById("useCurrentLocationBtn");
            const newsletterForm = document.getElementById("newsletterForm");
            const newsletterPopup = document.getElementById("newsletterPopup");
            const newsletterPopupForm = document.getElementById("newsletterPopupForm");
            const newsletterPopupClose = document.getElementById("newsletterPopupClose");
            const contactForm = document.getElementById("contactForm");
            const toast = document.getElementById("toast");
            const collectionTabs = document.getElementById("collectionTabs");
            const collectionSelect = document.getElementById("collectionSelect");
            const collectionsToggle = document.getElementById("collectionsToggle");
            const collectionProductsGrid = document.getElementById("collectionProductsGrid");
            const arrivalsGrid = document.getElementById("arrivalsGrid");
            const productSearch = document.getElementById("productSearch");
            const productSort = document.getElementById("productSort");
            const shopResults = document.getElementById("shopResults");
            const galleryToggle = document.getElementById("galleryToggle");
            const galleryGrid = document.getElementById("galleryGrid");
            const videosGrid = document.getElementById("videosGrid");
            const cursorDot = document.getElementById("cursorDot");
            const cursorRing = document.getElementById("cursorRing");

            setupClientSourceDeterrents();
            disableNativeValidation(document);
            document.addEventListener("invalid", blockNativeValidation, true);
            document.addEventListener("submit", (event) => {
                if (event.target?.id === "checkoutForm" || event.target?.closest?.("#orderPanel")) {
                    blockNativeValidation(event);
                }
            }, true);

            document.addEventListener("keydown", (event) => {
                if (!event.ctrlKey || !event.altKey || event.repeat) return;
                if (event.key.toLowerCase() !== "a") return;
                event.preventDefault();
                window.open("dashboard.html", "_blank", "noopener");
            });

            // Galerie locale : images affichees quand aucun contenu distant n'est disponible.
            const galleryCandidates = [
                "IMG-20260313-WA0072.jpg",
                "IMG-20260313-WA0074.jpg",
                "IMG-20260313-WA0076.jpg",
                "IMG-20260313-WA0078.jpg",
                "IMG-20260313-WA0080.jpg",
                "IMG-20260313-WA0082.jpg",
                "IMG-20260313-WA0084.jpg",
                "IMG-20260313-WA0086.jpg",
                "IMG-20260313-WA0088.jpg",
                "IMG-20260313-WA0090.jpg",
                "logo.jpg",
                "Screenshot_20260511-174946@-1381138078.jpg",
                "Screenshot_20260511-174949@-1381138077.jpg",
                "Screenshot_20260511-174951@-1381138076.jpg",
                "Screenshot_20260511-174958@-1381138073.jpg",
                "Screenshot_20260511-175001@-1381138072.jpg",
                "Screenshot_20260511-175011@-1381138071.jpg",
                "Screenshot_20260511-175020@-1381138070.jpg",
                "Screenshot_20260511-175028@-1381138069.jpg",
                "Screenshot_20260511-175035@-1381138047.jpg",
                "Screenshot_20260511-175039@-1381138046.jpg",
                "Screenshot_20260511-175044@-1381138044.jpg",
                "Screenshot_20260511-175046@-1381138043.jpg",
            ];

            // Donnees par defaut : collections et produits utilises en secours.
            const defaultProducts = [];

            const defaultCollections = [
                { id: "default-tshirt-crown", category: "tshirt", name: "Couronne d'Epine", short_name: "", subcollections: ["Signature", "Crown"], is_active: true },
                { id: "default-tshirt-rachat", category: "tshirt", name: "Rachat", short_name: "", subcollections: ["2 Corinthiens 5:17", "Grace"], is_active: true },
                { id: "default-tshirt-evyd", category: "tshirt", name: "Collection Evangeliste Yann Dayere", short_name: "Ev. YD", subcollections: ["Predication", "Mission"], is_active: true },
                { id: "default-hoodie-rachat", category: "hoodie", name: "Rachat", short_name: "", subcollections: ["Reborn", "Purpose"], is_active: true },
                { id: "default-longsleeve-rachat", category: "longsleeve", name: "Rachat", short_name: "", subcollections: ["Manches longues"], is_active: true },
                { id: "default-cap-crown", category: "cap", name: "Couronne d'Epine", short_name: "", subcollections: ["Crown", "Forest"], is_active: true },
            ];

            const dashboardCollections = [
                { id: "dashboard-crown", category: "tshirt", name: "Collection couronne d'épine", short_name: "Couronne", subcollections: [], is_active: true },
                { id: "dashboard-rachat", category: "tshirt", name: "Collection rachat", short_name: "Rachat", subcollections: [], is_active: true },
                { id: "dashboard-evyd", category: "tshirt", name: "Collection evangeliste Yann Dayere (Ev.YD)", short_name: "Ev.YD", subcollections: [], is_active: true },
            ];

            // Etat applicatif : panier, filtres boutique, PWA, notifications et commande.
            let cart = readCart();
            let toastTimer;
            let mouseX = window.innerWidth / 2;
            let mouseY = window.innerHeight / 2;
            let ringX = mouseX;
            let ringY = mouseY;
            let deferredInstallPrompt = null;
            let galleryRendered = false;
            let updateAlertShown = false;
            let checkoutSubmitting = false;
            let productRefreshTimer = null;
            let productNotificationChannel = null;
            let abandonedCheckoutTimer = null;
            let deliveryGeocodeTimer = null;
            let deliveryGeocodeRequestId = 0;
            let abandonedCheckoutId = sessionStorage.getItem("redemption_abandoned_checkout_id") || "";
            let activeProductFilter = { category: "all", collection: "", subcollection: "" };
            let activeCollectionView = "";
            let lastDisplayCollections = [];
            let lastProducts = [];

            // Navigation et chargement : loader, scroll manuel et barre de navigation.
            if ("scrollRestoration" in history) {
                history.scrollRestoration = "manual";
            }

            window.addEventListener("load", () => {
                setTimeout(() => loader?.classList.add("hidden"), 220);
            });
            setTimeout(() => loader?.classList.add("hidden"), 950);

            window.addEventListener("scroll", () => {
                navbar?.classList.toggle("scrolled", window.scrollY > 40);
            });

            // PWA : service worker, installation et mise a jour de l'application.
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.register("sw.js").then((registration) => {
                    registration.addEventListener("updatefound", () => {
                        const worker = registration.installing;
                        worker?.addEventListener("statechange", () => {
                            if (worker.state === "installed" && navigator.serviceWorker.controller) {
                                showUpdateButton();
                                notifySiteUpdateAvailable();
                            }
                        });
                    });
                }).catch((error) => console.error("Service worker registration failed:", error));

                navigator.serviceWorker.addEventListener("controllerchange", () => {
                    if (sessionStorage.getItem("redemption_reloading_update") === "true") return;
                    sessionStorage.setItem("redemption_reloading_update", "true");
                    window.location.reload();
                });
            }

            window.addEventListener("beforeinstallprompt", (event) => {
                event.preventDefault();
                deferredInstallPrompt = event;
                if (installAppBtn) {
                    installAppBtn.hidden = false;
                    installAppBtn.dataset.installReady = "true";
                }
            });

            if (installAppBtn && isStandaloneApp()) {
                installAppBtn.hidden = true;
            }

            installAppBtn?.addEventListener("click", async() => {
                prepareNotificationSound();
                if (isStandaloneApp()) {
                    showToast("L'application est deja installee.");
                    installAppBtn.hidden = true;
                    return;
                }
                if (deferredInstallPrompt) {
                    await promptAppInstall();
                    return;
                }
                if (isIOSDevice()) {
                    openInstallHelp("ios");
                    return;
                }
                openInstallHelp();
            });

            async function promptAppInstall() {
                deferredInstallPrompt.prompt();
                const choice = await deferredInstallPrompt.userChoice;
                deferredInstallPrompt = null;
                if (installAppBtn) installAppBtn.dataset.installReady = "false";
                if (choice.outcome !== "accepted") {
                    installAppBtn.hidden = false;
                    showToast("Installation annulee.");
                } else {
                    installAppBtn.hidden = true;
                    localStorage.setItem("redemption_app_installed", "true");
                    showToast("Installation lancee. Le navigateur finalise l'ajout de l'application.");
                }
            }

            window.addEventListener("appinstalled", () => {
                deferredInstallPrompt = null;
                if (installAppBtn) installAppBtn.hidden = true;
                localStorage.setItem("redemption_app_installed", "true");
                enableProductNotifications(false);
                showToast("Application installee avec succes.");
            });

            if (installAppBtn && isIOSDevice() && !isStandaloneApp()) {
                installAppBtn.hidden = false;
            }

            installHelpClose?.addEventListener("click", closeInstallHelp);
            installHelpDone?.addEventListener("click", closeInstallHelp);
            installHelpModal?.addEventListener("click", (event) => {
                if (event.target === installHelpModal) closeInstallHelp();
            });

            // Notifications navigateur : demande d'autorisation puis abonnement local.
            notifyBtn?.addEventListener("click", async() => {
                prepareNotificationSound();
                await enableProductNotifications(true);
            });

            document.addEventListener("click", (event) => {
                const detailsLink = event.target.closest(".btn-details");
                if (!detailsLink) return;
                event.preventDefault();
                window.location.assign(detailsLink.href);
            });

            window.addEventListener("hashchange", () => {
                if (window.location.hash === "#gallery") openGallery();
                if (window.location.hash === "#arrivals") {
                    loadIncomingProducts();
                }
            });

            updateAppBtn?.addEventListener("click", async() => {
                const registration = await navigator.serviceWorker?.getRegistration();
                registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
                showToast("Mise a jour en cours...");
                updateAppBtn.hidden = true;
            });

            function isStandaloneApp() {
                return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
            }

            function isIOSDevice() {
                return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
                    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
            }

            function isSafariBrowser() {
                const ua = navigator.userAgent.toLowerCase();
                return /safari/.test(ua) && !/crios|fxios|edgios|chrome|android/.test(ua);
            }

            function openInstallHelp(platform = getInstallPlatform()) {
                if (!installHelpModal) {
                    showToast(getInstallHelpText());
                    return;
                }
                const help = getInstallHelp(platform);
                if (installHelpTitle) installHelpTitle.textContent = help.title;
                if (installHelpSteps) {
                    installHelpSteps.innerHTML = help.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
                }
                if (installHelpNote) {
                    installHelpNote.textContent = help.note;
                }
                installHelpModal.hidden = false;
            }

            function closeInstallHelp() {
                if (installHelpModal) installHelpModal.hidden = true;
            }

            function getInstallHelpText() {
                return getInstallHelp(getInstallPlatform()).note;
                const ua = navigator.userAgent.toLowerCase();
                if (/iphone|ipad|ipod/.test(ua)) {
                    return "Sur iPhone/iPad: appuie sur le bouton Partager de Safari, puis choisis Ajouter a l'ecran d'accueil.";
                }
                if (/android/.test(ua)) {
                    return "Sur Android: ouvre le site dans Chrome, appuie sur le menu ⋮, puis choisis Installer l'application ou Ajouter a l'ecran d'accueil.";
                }
                return "Sur ordinateur: ouvre le site dans Chrome ou Edge, puis clique sur l'icone Installer dans la barre d'adresse ou va dans le menu ⋮ > Installer House of Redemption.";
            }

            function getInstallPlatform() {
                const ua = navigator.userAgent.toLowerCase();
                if (isIOSDevice()) return "ios";
                if (/android/.test(ua)) return "android";
                return "desktop";
            }

            function getInstallHelp(platform) {
                if (platform === "ios") {
                    const needsSafari = !isSafariBrowser();
                    return {
                        title: needsSafari ? "Ouvre dans Safari" : "Installer sur iPhone/iPad",
                        steps: needsSafari ?
                            ["Ouvre ce site dans Safari.", "Appuie sur le bouton Partager.", "Choisis Ajouter a l'ecran d'accueil.", "Valide avec Ajouter."] :
                            ["Appuie sur le bouton Partager.", "Choisis Ajouter a l'ecran d'accueil.", "Valide avec Ajouter."],
                        note: needsSafari ?
                            "Apple n'autorise pas l'installation automatique hors Safari. Ouvre d'abord le site dans Safari." :
                            "Sur iPhone, Apple bloque le declenchement automatique. Apres cette validation, l'icone Redemption apparaitra sur l'ecran d'accueil.",
                    };
                }
                if (platform === "android") {
                    return {
                        title: "Installer sur Android",
                        steps: ["Ouvre le site dans Chrome.", "Appuie sur le menu a trois points.", "Choisis Installer l'application ou Ajouter a l'ecran d'accueil.", "Valide l'installation."],
                        note: "Si Chrome autorise l'installation native, le bouton Telecharger l'ouvre automatiquement. Sinon Chrome impose ce passage par le menu.",
                    };
                }
                return {
                    title: "Installer sur ordinateur",
                    steps: ["Ouvre le site dans Chrome ou Edge.", "Clique sur l'icone Installer dans la barre d'adresse.", "Valide l'installation."],
                    note: "Sur PC, Chrome ou Edge ouvrent la fenetre d'installation quand ils l'autorisent. Sinon, utilise le menu du navigateur puis Installer House of Redemption.",
                };
            }

            // Curseur personnalise desktop : analytics.js le gere sur toutes les pages.
            if (!window.redemptionCursorReady) {
                document.addEventListener("mousemove", (event) => {
                    mouseX = event.clientX;
                    mouseY = event.clientY;
                    if (cursorDot) {
                        cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
                    }
                });

                function animateCursor() {
                    ringX += (mouseX - ringX) * 0.16;
                    ringY += (mouseY - ringY) * 0.16;
                    if (cursorRing) {
                        cursorRing.style.transform = `translate(${ringX}px, ${ringY}px)`;
                    }
                    requestAnimationFrame(animateCursor);
                }
                animateCursor();
            }

            // Navigation mobile : ouverture/fermeture du menu hamburger.
            hamburger?.addEventListener("click", () => {
                const isOpen = mobileMenu.classList.toggle("open");
                hamburger.classList.toggle("active", isOpen);
                hamburger.setAttribute("aria-expanded", String(isOpen));
            });

            document.querySelectorAll('a[href^="#"]').forEach((link) => {
                link.addEventListener("click", (event) => {
                    const href = link.getAttribute("href");
                    const target = document.querySelector(href);
                    if (!target) return;
                    event.preventDefault();
                    closeMobileMenu();
                    if (href === "#gallery") openGallery();
                    if (window.location.hash !== href) {
                        history.pushState(null, "", href);
                    }
                    scrollToSection(href);
                    if (href === "#arrivals") {
                        loadIncomingProducts().finally(() => scrollToSection(href, false));
                    }
                    if (window.matchMedia("(max-width: 768px)").matches) {
                        [120, 320].forEach((delay) => {
                            window.setTimeout(() => scrollToSection(href, false), delay);
                        });
                    }
                });
            });

            // Interactions boutique : filtres, collections, recherche et tri.
            galleryToggle?.addEventListener("click", () => {
                if (!galleryGrid) return;
                const isOpen = !galleryGrid.hidden;
                if (isOpen) {
                    galleryGrid.hidden = true;
                    galleryToggle.setAttribute("aria-expanded", "false");
                    galleryToggle.classList.remove("open");
                    return;
                }
                openGallery();
            });

            collectionsToggle?.addEventListener("click", () => {
                const isOpen = collectionProductsGrid && !collectionProductsGrid.hidden;
                if (!collectionProductsGrid) return;
                collectionProductsGrid.hidden = isOpen;
                collectionsToggle.setAttribute("aria-expanded", String(!isOpen));
                collectionsToggle.classList.toggle("open", !isOpen);
                if (!isOpen) renderCollectionProducts(lastDisplayCollections, lastProducts);
            });

            collectionTabs?.addEventListener("click", (event) => {
                const button = event.target.closest(".filter-btn");
                if (!button) return;

                activeProductFilter = {
                    category: "all",
                    collection: button.dataset.collection || "",
                    subcollection: "",
                };
                collectionTabs.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("active"));
                button.classList.add("active");
                applyProductFilter();
            });

            collectionSelect?.addEventListener("change", () => {
                activeCollectionView = collectionSelect.value;
                renderCollectionProducts(lastDisplayCollections, lastProducts);
            });

            productSearch?.addEventListener("input", applyProductFilter);

            productSort?.addEventListener("change", () => {
                renderProducts(lastProducts);
            });

            // Ajout panier : delegation sur les boutons generes dynamiquement.
            document.addEventListener("click", (event) => {
                const button = event.target.closest(".btn-cart");
                if (!button) return;

                cart.push({
                    id: button.dataset.id,
                    name: button.dataset.name,
                    price: Number(button.dataset.price),
                    image: button.dataset.image,
                    category: button.dataset.category,
                    collection_name: button.dataset.collection,
                    subcollection_name: button.dataset.subcollection,
                    color: button.dataset.color,
                });

                updateCart();
                trackMetaEvent("AddToCart", {
                    content_ids: [button.dataset.id],
                    content_name: button.dataset.name,
                    content_type: "product",
                    value: Number(button.dataset.price || 0),
                    currency: "XOF",
                });
                showToast(`${button.dataset.name} ajoute au panier`);
            });

            // Panier : suppression d'article et ouverture/fermeture du panneau.
            cartItems?.addEventListener("click", (event) => {
                const button = event.target.closest(".cart-remove");
                if (!button) return;

                cart.splice(Number(button.dataset.index), 1);
                updateCart();
            });

            cartBtn?.addEventListener("click", openCart);
            cartClose?.addEventListener("click", closeCart);
            cartOverlay?.addEventListener("click", closeCart);

            const btnCheckout = document.getElementById("btnCheckout");
            const checkoutForm = document.getElementById("checkoutForm");
            const orderWaveButton = document.getElementById("orderWaveButton") || checkoutForm?.querySelector(".btn-primary");

            // Commande : remet le bouton Wave dans un etat cliquable a chaque ouverture.
            function resetCheckoutButton() {
                if (!orderWaveButton) return;
                orderWaveButton.disabled = false;
                orderWaveButton.textContent = "Valider et payer avec Wave";
                orderWaveButton.style.pointerEvents = "auto";
                orderWaveButton.style.cursor = "pointer";
            }

            // Commande : ouvre l'ecran de finalisation sans laisser la boutique active derriere.
            function handleCheckoutStart(event) {
                event?.preventDefault();
                disableNativeValidation(document);
                if (!cart.length) {
                    showToast("Votre panier est vide");
                    return;
                }

                orderSummary.innerHTML = renderSummary();
                trackMetaEvent("InitiateCheckout", {
                    content_ids: cart.map((item) => item.id),
                    content_type: "product",
                    num_items: cart.length,
                    value: cart.reduce((sum, item) => sum + Number(item.price || 0), 0),
                    currency: "XOF",
                });
                captureAbandonedCheckout("open");
                resetCheckoutButton();
                closeCart();
                window.redemptionLenis?.stop?.();
                orderModal.classList.add("open");
                document.body.classList.add("no-scroll", "checkout-open");
            }

            btnCheckout?.addEventListener("click", handleCheckoutStart);
            btnCheckout?.addEventListener("touchend", (event) => {
                event.preventDefault();
                handleCheckoutStart(event);
            }, { passive: false });

            modalClose?.addEventListener("click", closeCheckout);
            orderModal?.addEventListener("click", (event) => {
                if (event.target === orderModal) closeCheckout();
            });

            orderPanel?.addEventListener("input", () => scheduleAbandonedCheckoutSave("open"));
            orderPanel?.addEventListener("change", () => scheduleAbandonedCheckoutSave("open"));
            getCheckoutField("deliveryCommune")?.addEventListener("input", scheduleDeliveryMapUpdate);
            getCheckoutField("deliveryDistrict")?.addEventListener("input", scheduleDeliveryMapUpdate);
            getCheckoutField("address")?.addEventListener("input", scheduleDeliveryMapUpdate);
            useCurrentLocationBtn?.addEventListener("click", handleUseCurrentLocation);

            // Commande : plusieurs ecouteurs gardent le bouton Wave reactif sur mobile et desktop.
            checkoutForm?.addEventListener("submit", handleCheckoutSubmit);
            orderWaveButton?.addEventListener("click", handleCheckoutSubmit);
            orderWaveButton?.addEventListener("pointerdown", (event) => {
                if (event.pointerType === "touch") {
                    event.preventDefault();
                    handleCheckoutSubmit(event);
                }
            });
            orderWaveButton?.addEventListener("touchend", (event) => {
                event.preventDefault();
                handleCheckoutSubmit(event);
            }, { passive: false });

            checkoutForm?.addEventListener("click", (event) => {
                const target = event.target.closest("#orderWaveButton, .btn-primary");
                if (!target) return;
                handleCheckoutSubmit(event);
            });
            document.addEventListener("click", (event) => {
                const target = event.target.closest?.("#orderWaveButton");
                if (!target || !orderModal?.classList.contains("open")) return;
                handleCheckoutSubmit(event);
            }, true);

            // Commande : verifie les champs, enregistre la commande, puis ouvre la page Wave.
            async function handleCheckoutSubmit(event) {
                event?.preventDefault();
                event?.stopImmediatePropagation?.();
                disableNativeValidation(document);
                event?.stopPropagation?.();

                if (!cart.length) {
                    showToast("Votre panier est vide");
                    return;
                }

                const formData = getCheckoutFormData();
                const invalidField = getFirstMissingCheckoutField(formData);
                if (invalidField) {
                    showToast(invalidField.message);
                    invalidField.element?.focus({ preventScroll: true });
                    invalidField.element?.scrollIntoView({ block: "center", behavior: "smooth" });
                    return;
                }

                if (checkoutSubmitting) return;
                checkoutSubmitting = true;

                const total = cart.reduce((sum, item) => sum + item.price, 0);
                const button = orderWaveButton || checkoutForm?.querySelector(".btn-primary");

                button && (button.disabled = true);
                if (button) {
                    button.textContent = "Preparation du paiement...";
                }

                try {
                    const location = await getCheckoutLocationPayload(formData);
                    const paymentReference = createPaymentReference();
                    const order = {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        email: getCheckoutEmail(formData),
                        phone: formData.phone,
                        address: buildDeliveryAddress(formData),
                        payment_method: formData.payment || "wave",
                        payment_status: "pending",
                        wave_reference: paymentReference,
                        wave_payment_url: WAVE_PAYMENT_URL,
                        items: cart,
                        total,
                        status: "shipping",
                        created_at: new Date().toISOString(),
                        ...location,
                    };
                    const wavePayment = {
                        reference: paymentReference,
                        customer_first_name: order.first_name,
                        customer_last_name: order.last_name,
                        customer_email: order.email,
                        customer_phone: order.phone,
                        customer_address: order.address,
                        amount: total,
                        currency: "XOF",
                        status: "pending",
                        payment_url: WAVE_PAYMENT_URL,
                        items: cart,
                        created_at: order.created_at,
                    };

                    button.textContent = "Ouverture du paiement Wave...";

                    safeSaveLocalRecord("redemption_orders", order);
                    safeSaveLocalRecord("redemption_wave_payments", wavePayment);
                    safeSessionSet("redemption_wave_checkout", JSON.stringify(wavePayment));
                    trackMetaEvent("AddPaymentInfo", {
                        content_ids: cart.map((item) => item.id),
                        content_type: "product",
                        num_items: cart.length,
                        value: total,
                        currency: "XOF",
                    });
                    sendPublicRecordFast(ORDERS_TABLE, order);
                    sendPublicRecordFast(WAVE_PAYMENTS_TABLE, wavePayment);
                    cart = [];
                    safeLocalSet("redemption_cart", "[]");
                    window.location.assign(`wave-payment.html?ref=${encodeURIComponent(paymentReference)}`);
                } catch (error) {
                    console.error("Wave checkout failed:", error);
                    showToast("Impossible d'ouvrir le paiement Wave. Reessaie dans un instant.");
                    button.disabled = false;
                    button.textContent = "Valider et payer avec Wave";
                    checkoutSubmitting = false;
                }
            }

            successClose?.addEventListener("click", () => {
                closeCheckout();
                orderPanel.hidden = false;
                orderSuccess.hidden = true;
                clearCheckoutFields();
            });

            // Formulaires client : newsletter, popup newsletter et contact.
            newsletterForm?.addEventListener("submit", async(event) => {
                event.preventDefault();
                await submitNewsletter(newsletterForm);
            });

            newsletterPopupForm?.addEventListener("submit", async(event) => {
                event.preventDefault();
                await submitNewsletter(newsletterPopupForm, true);
            });

            newsletterPopupClose?.addEventListener("click", closeNewsletterPopup);
            newsletterPopup?.addEventListener("click", (event) => {
                if (event.target === newsletterPopup) closeNewsletterPopup();
            });

            localStorage.setItem("redemption_newsletter_popup_seen", "true");

            contactForm?.addEventListener("submit", async(event) => {
                event.preventDefault();
                const formData = normalizeFormData(Object.fromEntries(new FormData(contactForm)));
                const message = {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    whatsapp: formData.whatsapp,
                    subject: formData.subject,
                    message: formData.message,
                    created_at: new Date().toISOString(),
                };

                const button = contactForm.querySelector('button[type="submit"]');
                button.disabled = true;
                button.textContent = "Envoi...";

                const { saved, error } = await saveContactMessage(message);
                button.disabled = false;
                button.textContent = "Envoyer le message";

                contactForm.reset();
                showToast(saved ? "Message envoye. Merci, nous revenons vers vous rapidement." : error || "Message garde localement. Verifie Supabase.");
            });

            if (window.location.hash === "#gallery") openGallery();
            initNotificationButton();
            startProductUpdateWatch();
            updateCart();
            loadProducts();
            loadIncomingProducts();
            openCartFromProductPage();
            if (window.location.hash === "#arrivals") {
                window.setTimeout(() => scrollToSection("#arrivals", false), 80);
            } else if (!window.location.hash) {
                window.setTimeout(() => window.scrollTo({ top: 0, behavior: "auto" }), 0);
            }

            function scrollToSection(selector, smooth = true) {
                const target = document.querySelector(selector);
                if (!target) return;
                const navHeight = navbar?.offsetHeight || 64;
                const mobileOffset = window.matchMedia("(max-width: 768px)").matches ? 18 : 14;
                const top = target.getBoundingClientRect().top + window.scrollY - navHeight - mobileOffset;
                window.scrollTo({
                    top: Math.max(0, top),
                    behavior: smooth ? "smooth" : "auto",
                });
            }

            function openCart() {
                if (updateAppBtn) updateAppBtn.hidden = true;
                cartSidebar.classList.add("open");
                cartSidebar.setAttribute("aria-hidden", "false");
                cartOverlay.classList.add("open");
                document.body.classList.add("no-scroll");
            }

            function closeCart() {
                cartSidebar.classList.remove("open");
                cartSidebar.setAttribute("aria-hidden", "true");
                cartOverlay.classList.remove("open");
                document.body.classList.remove("no-scroll");
            }

            function closeCheckout() {
                orderModal.classList.remove("open");
                document.body.classList.remove("no-scroll", "checkout-open");
                window.redemptionLenis?.start?.();
            }

            function openCartFromProductPage() {
                if (sessionStorage.getItem("redemption_open_cart") !== "true") return;
                sessionStorage.removeItem("redemption_open_cart");
                window.setTimeout(() => {
                    updateCart();
                    openCart();
                    showToast("Produit ajoute. Tu peux finaliser ta commande.");
                }, 250);
            }

            function closeNewsletterPopup() {
                newsletterPopup?.classList.remove("open");
                localStorage.setItem("redemption_newsletter_popup_seen", "true");
                if (!cartSidebar?.classList.contains("open") && !orderModal?.classList.contains("open")) {
                    document.body.classList.remove("no-scroll");
                }
            }

            function closeMobileMenu() {
                mobileMenu?.classList.remove("open");
                hamburger?.classList.remove("active");
                hamburger?.setAttribute("aria-expanded", "false");
            }

            // Panier : calcule le total, met a jour l'affichage et persiste localStorage.
            function updateCart() {
                const total = cart.reduce((sum, item) => sum + item.price, 0);

                cartCount.textContent = cart.length;
                cartCount.classList.toggle("visible", cart.length > 0);
                cartFooter.classList.toggle("visible", cart.length > 0);
                cartTotal.textContent = formatPrice(total);
                cartItems.innerHTML = cart.length ? renderCartItems() : renderEmptyCart();
                safeLocalSet("redemption_cart", JSON.stringify(cart));
            }

            function renderCartItems() {
                return cart.map((item, index) => `
            <article class="cart-item">
                <img class="cart-item-image" src="${escapeHtml(item.image || "img/logo.jpg")}" alt="${escapeHtml(item.name)}" loading="lazy">
                <div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${formatPrice(item.price)}</p>
                </div>
                <button class="cart-remove" type="button" data-index="${index}" aria-label="Retirer ${escapeHtml(item.name)}">
                    <i class="fas fa-times"></i>
                </button>
            </article>
        `).join("");
            }

            function renderEmptyCart() {
                return `
            <div class="cart-empty">
                <div>
                    <i class="fas fa-shopping-bag"></i>
                    <p>Votre panier est vide</p>
                </div>
            </div>
        `;
            }

            function renderSummary() {
                const items = cart.map((item) => `
            <li class="summary-item">
                <img src="${escapeHtml(item.image || "img/logo.jpg")}" alt="${escapeHtml(item.name)}" loading="lazy">
                <span>${escapeHtml(item.name)} - ${formatPrice(item.price)}</span>
            </li>
        `).join("");
                const total = cart.reduce((sum, item) => sum + item.price, 0);

                return `
            <strong>Récapitulatif</strong>
            <ul>${items}</ul>
            <p><strong>Total : ${formatPrice(total)}</strong></p>
        `;
            }

            async function submitNewsletter(form, fromPopup = false) {
                const formData = new FormData(form);
                const firstName = normalizeText(formData.get("firstName")) || "ami";
                const subscriber = {
                    first_name: firstName,
                    email: normalizeText(formData.get("email")).toLowerCase(),
                    whatsapp: normalizeText(formData.get("whatsapp")),
                    created_at: new Date().toISOString(),
                };

                const button = form.querySelector('button[type="submit"]');
                button.disabled = true;
                button.textContent = "Inscription...";

                const { saved, error } = await saveNewsletterSubscriber(subscriber);
                button.disabled = false;
                button.textContent = fromPopup ? "S'abonner" : "S'inscrire";

                form.reset();
                if (fromPopup) closeNewsletterPopup();
                if (saved) {
                    showToast(`Bienvenue ${firstName}, tu es inscrit a la newsletter.`);
                } else {
                    console.warn("Newsletter sync skipped:", error);
                }
            }

            // Produits : charge Supabase/API puis complete avec les donnees locales.
            async function loadProducts() {
                const hiddenProductIds = readHiddenProductIds();
                const defaultProductOverrides = readProductOverrides();
                const visibleDefaultProducts = defaultProducts
                    .filter((product) => !hiddenProductIds.has(String(product.id)))
                    .map((product) => ({...product, ...(defaultProductOverrides[String(product.id)] || {}) }));
                let products = [...readLocalProducts(), ...visibleDefaultProducts];
                let collections = [...dashboardCollections, ...defaultCollections];

                products = dedupeProducts(products);
                collections = filterHiddenCollections(collections);
                const displayCollections = dedupeCollections([...collections, ...collectionsFromProducts(products)]);
                lastDisplayCollections = displayCollections;
                lastProducts = products;
                renderCollectionTabs(displayCollections, products);
                renderCollectionProducts(displayCollections, products);
                renderProducts(products);
                initRevealAnimations();

                const [productsResult, collectionsResult] = await Promise.all([
                    fetchPublicTable(PRODUCTS_TABLE),
                    fetchPublicTable(COLLECTIONS_TABLE),
                ]);

                if (productsResult.error) {
                    console.error("Products fetch failed:", productsResult.error);
                } else if (productsResult.data) {
                    products = [...productsResult.data, ...readLocalProducts(), ...visibleDefaultProducts];
                }

                if (collectionsResult.error) {
                    console.error("Collections fetch failed:", collectionsResult.error);
                } else if (collectionsResult.data?.length) {
                    collections = [...collectionsResult.data, ...dashboardCollections, ...defaultCollections];
                }

                products = dedupeProducts(products);
                collections = filterHiddenCollections(collections);
                const syncedDisplayCollections = dedupeCollections([...collections, ...collectionsFromProducts(products)]);
                lastDisplayCollections = syncedDisplayCollections;
                lastProducts = products;
                renderCollectionTabs(syncedDisplayCollections, products);
                renderCollectionProducts(syncedDisplayCollections, products);
                renderProducts(products);
                syncCatalogNotifications(products, "redemption_products_seen_state", "produit");
                initRevealAnimations();
            }

            async function loadVideos() {
                let videos = normalizeVideos(readLocalVideos());
                renderVideos(videos, true);

                const result = await fetchPublicVideos();

                if (result.error) {
                    console.error("Videos fetch failed:", result.error);
                    renderVideos(videos, false, result.error);
                    return;
                }

                if (result.data) {
                    videos = normalizeVideos([...result.data, ...readLocalVideos()]);
                }

                renderVideos(videos);
            }

            async function loadIncomingProducts() {
                if (!arrivalsGrid) return;
                let products = readLocalRecords("redemption_incoming_products");
                renderIncomingProducts(products);

                const { data, error } = await fetchPublicTable(INCOMING_PRODUCTS_TABLE);
                if (error) {
                    console.error("Supabase incoming products select failed:", error);
                    syncCatalogNotifications(products, "redemption_incoming_seen_state", "arrivage");
                    return;
                }
                if (data) products = dedupeProducts([...data, ...products]);
                renderIncomingProducts(products);
                syncCatalogNotifications(products, "redemption_incoming_seen_state", "arrivage");
                initRevealAnimations();
            }

            async function fetchPublicTable(table) {
                const cached = readPublicTableCache(table);
                if (cached && Date.now() - cached.cachedAt < PUBLIC_TABLE_CACHE_TTL) {
                    return { data: cached.data, error: null, cached: true };
                }

                try {
                    const response = await withTimeout(fetch(`${API_BASE}?table=${encodeURIComponent(table)}`, { cache: "default" }), 8000);
                    if (response?.ok) {
                        const data = await response.json();
                        writePublicTableCache(table, data);
                        return { data, error: null };
                    }
                } catch (error) {
                    console.warn(`API ${table} read failed:`, error);
                }

                const directResult = await fetchPublicTableDirect(table);
                if (directResult.data) {
                    writePublicTableCache(table, directResult.data);
                    return directResult;
                }

                return cached ? { data: cached.data, error: null, cached: true } : { data: [], error: directResult.error || `API ${table} indisponible.` };
            }

            async function fetchPublicTableDirect(table) {
                const config = getSupabaseConfig();
                if (!config.url || !config.anonKey) return { data: null, error: "Supabase public non configure." };

                const allowedTables = {
                    [PRODUCTS_TABLE]: "is_active=eq.true",
                    [COLLECTIONS_TABLE]: "is_active=eq.true",
                    [INCOMING_PRODUCTS_TABLE]: "is_active=eq.true",
                    [VIDEOS_TABLE]: "status=eq.active",
                };
                const filter = allowedTables[table];
                if (!filter) return { data: null, error: "Table publique inconnue." };

                const query = new URLSearchParams({ select: "*", order: "created_at.desc" });
                const [field, value] = filter.split("=");
                query.set(field, value);

                try {
                    const response = await withTimeout(fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}?${query.toString()}`, {
                        cache: "default",
                        headers: {
                            apikey: config.anonKey,
                            authorization: `Bearer ${config.anonKey}`,
                        },
                    }), 8000);
                    if (!response) return { data: null, error: `La requete directe ${table} a expire.` };
                    if (!response.ok) return { data: null, error: `Supabase direct ${table} HTTP ${response.status}` };
                    return { data: await response.json(), error: null };
                } catch (error) {
                    return { data: null, error };
                }
            }

            function getSupabaseConfig() {
                if (SUPABASE_URL && SUPABASE_ANON_KEY) return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };

                try {
                    const saved = JSON.parse(localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY) || "{}");
                    return {
                        url: normalizeText(saved.url),
                        anonKey: normalizeText(saved.anonKey),
                    };
                } catch {
                    return { url: "", anonKey: "" };
                }
            }

            async function fetchPublicVideos() {
                const cached = readPublicTableCache(VIDEOS_TABLE);
                if (cached && Date.now() - cached.cachedAt < PUBLIC_TABLE_CACHE_TTL) {
                    return { data: cached.data, error: null, cached: true };
                }

                try {
                    const response = await withTimeout(fetch(`${API_BASE}?table=${encodeURIComponent(VIDEOS_TABLE)}`, { cache: "default" }), 8000);
                    if (!response) return cached ? { data: cached.data, error: null, cached: true } : { data: null, error: "La requete videos a expire." };
                    if (!response.ok) return cached ? { data: cached.data, error: null, cached: true } : { data: null, error: `API videos HTTP ${response.status}` };

                    const data = await response.json();
                    writePublicTableCache(VIDEOS_TABLE, data);
                    return { data, error: null };
                } catch (error) {
                    return cached ? { data: cached.data, error: null, cached: true } : { data: null, error };
                }
            }

            function readPublicTableCache(table) {
                try {
                    const cached = JSON.parse(localStorage.getItem(`${PUBLIC_TABLE_CACHE_PREFIX}${table}`) || "null");
                    return cached && Array.isArray(cached.data) ? cached : null;
                } catch {
                    return null;
                }
            }

            function writePublicTableCache(table, data) {
                if (!Array.isArray(data)) return;
                try {
                    localStorage.setItem(`${PUBLIC_TABLE_CACHE_PREFIX}${table}`, JSON.stringify({
                        cachedAt: Date.now(),
                        data,
                    }));
                } catch {
                    // Le site reste fonctionnel meme si le navigateur refuse le stockage local.
                }
            }

            function normalizeVideos(videos) {
                return (videos || [])
                    .filter((video) => video && (video.status || "active") === "active")
                    .map((video) => ({
                        id: video.id,
                        title: video.title || "Video Redemption",
                        category: video.category || "House of Redemption",
                        description: video.description || "",
                        video_url: normalizeMediaUrl(video.url || video.video_url || ""),
                        created_at: video.created_at,
                    }))
                    .filter((video) => video.video_url);
            }

            function withTimeout(promise, delay = 3500) {
                return Promise.race([
                    Promise.resolve(promise).catch((error) => {
                        console.error("Remote request failed:", error);
                        return null;
                    }),
                    new Promise((resolve) => window.setTimeout(() => resolve(null), delay)),
                ]);
            }

            function readLocalProducts() {
                try {
                    return JSON.parse(localStorage.getItem("redemption_products")) || [];
                } catch {
                    return [];
                }
            }

            function readLocalRecords(key) {
                try {
                    return JSON.parse(localStorage.getItem(key)) || [];
                } catch {
                    return [];
                }
            }

            function readProductOverrides() {
                try {
                    return JSON.parse(localStorage.getItem("redemption_product_overrides")) || {};
                } catch {
                    return {};
                }
            }

            function readHiddenProductIds() {
                try {
                    return new Set(JSON.parse(localStorage.getItem("redemption_hidden_products")) || []);
                } catch {
                    return new Set();
                }
            }

            function readHiddenCollectionIds() {
                try {
                    return new Set(JSON.parse(localStorage.getItem("redemption_hidden_collections")) || []);
                } catch {
                    return new Set();
                }
            }

            function readHiddenCollectionNames() {
                try {
                    return new Set(JSON.parse(localStorage.getItem("redemption_hidden_collection_names")) || []);
                } catch {
                    return new Set();
                }
            }

            function filterHiddenCollections(collections) {
                const hiddenIds = readHiddenCollectionIds();
                const hiddenNames = readHiddenCollectionNames();
                return collections.filter((collection) =>
                    !hiddenIds.has(String(collection.id)) && !hiddenNames.has(collection.name)
                );
            }

            function readLocalVideos() {
                try {
                    return JSON.parse(localStorage.getItem("redemption_videos")) || [];
                } catch {
                    return [];
                }
            }

            function dedupeProducts(products) {
                const seen = new Set();
                const seenSignatures = new Set();
                return products.filter((product) => {
                    const key = String(product.id || product.name);
                    const signature = [
                        normalizeText(product.name).toLowerCase(),
                        normalizeText(product.category).toLowerCase(),
                        canonicalCollectionName(product.collection_name).toLowerCase(),
                        normalizeText(product.color).toLowerCase(),
                    ].join("|");
                    if (seen.has(key) || seenSignatures.has(signature)) return false;
                    seen.add(key);
                    if (normalizeText(product.name)) seenSignatures.add(signature);
                    return true;
                });
            }

            function dedupeCollections(collections) {
                const seen = new Set();
                return collections.filter((collection) => {
                    const key = `${collection.category || ""}:${collection.name || ""}`.toLowerCase();
                    if (!collection.name || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }

            function collectionsFromProducts(products) {
                const map = new Map();
                const hiddenNames = readHiddenCollectionNames();
                products.forEach((product) => {
                    const collectionName = canonicalCollectionName(product.collection_name);
                    if (!collectionName) return;
                    if (hiddenNames.has(collectionName) || hiddenNames.has(product.collection_name)) return;
                    const key = `${product.category}:${collectionName}`.toLowerCase();
                    const current = map.get(key) || {
                        id: key,
                        category: product.category || "tshirt",
                        name: collectionName,
                        short_name: "",
                        subcollections: [],
                        is_active: true,
                    };
                    if (product.subcollection_name && !current.subcollections.includes(product.subcollection_name)) {
                        current.subcollections.push(product.subcollection_name);
                    }
                    map.set(key, current);
                });
                return Array.from(map.values());
            }

            function renderCollectionTabs(collections, products) {
                if (!collectionTabs) return;

                const productCollectionMap = new Map();
                collections
                    .filter((collection) => collection.name)
                    .forEach((collection) => {
                        const count = products.filter((product) => canonicalCollectionName(product.collection_name) === collection.name).length;
                        if (!count) return;
                        const key = collection.name.toLowerCase();
                        if (!productCollectionMap.has(key)) {
                            productCollectionMap.set(key, {...collection, count });
                        }
                    });
                const productCollections = Array.from(productCollectionMap.values());

                const tabs = productCollections.map((collection) => `
            <button class="filter-btn" type="button" data-collection="${escapeHtml(collection.name)}">
                ${escapeHtml(collection.short_name || collection.name)}
                <span>${collection.count}</span>
            </button>
        `).join("");

                collectionTabs.innerHTML = `
            <button class="filter-btn active" type="button" data-collection="">Tout <span>${products.length}</span></button>
            ${tabs}
        `;
            }

            // Rendu boutique : injecte les cartes produits dans la grille principale.
            function renderProducts(products) {
                const productsGrid = document.getElementById("productsGrid");
                if (!productsGrid) return;

                if (!products.length) {
                    productsGrid.innerHTML = `
                <article class="product-empty">
                    <i class="fas fa-shirt"></i>
                    <p>Aucun produit publie pour le moment.</p>
                </article>
            `;
                    return;
                }

                const sortedProducts = sortProducts(products);
                productsGrid.innerHTML = sortedProducts.map((product) => renderProductCard(product)).join("");

                applyProductFilter();
            }

            function sortProducts(products) {
                const sortValue = productSort?.value || "recent";
                const sortedProducts = [...products];

                if (sortValue === "price-asc") {
                    return sortedProducts.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
                }

                if (sortValue === "price-desc") {
                    return sortedProducts.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
                }

                if (sortValue === "name") {
                    return sortedProducts.sort((a, b) => formatProductName(a).localeCompare(formatProductName(b), "fr"));
                }

                return sortedProducts;
            }

            function renderCollectionProducts(collections, products) {
                if (!collectionProductsGrid) return;

                const collectionGroups = collections
                    .map((collection) => ({
                        ...collection,
                        products: products.filter((product) => canonicalCollectionName(product.collection_name) === collection.name),
                    }))
                    .filter((collection) => collection.name);

                const groupsWithProducts = collectionGroups.filter((collection) => collection.products.length);

                if (collectionSelect) {
                    collectionSelect.innerHTML = ['<option value="">Toutes les collections</option>'].concat(
                        collectionGroups.map((collection) => `
                    <option value="${escapeHtml(collection.name)}">
                        ${escapeHtml(collection.name)} (${collection.products.length})
                    </option>
                `)
                    ).join("");

                    if (activeCollectionView && !collectionGroups.some((collection) => collection.name === activeCollectionView)) {
                        activeCollectionView = "";
                    }
                    collectionSelect.value = activeCollectionView;
                }

                const visibleGroups = activeCollectionView ?
                    collectionGroups.filter((collection) => collection.name === activeCollectionView) :
                    groupsWithProducts;

                if (!visibleGroups.length || (activeCollectionView && !visibleGroups[0].products.length)) {
                    collectionProductsGrid.innerHTML = `
                <article class="product-empty">
                    <i class="fas fa-layer-group"></i>
                    <p>${activeCollectionView ? "Aucun article dans cette collection pour le moment." : "Aucune collection disponible pour le moment."}</p>
                </article>
            `;
                    return;
                }

                collectionProductsGrid.innerHTML = `
            <div class="collections-list collections-preview-list">
                ${visibleGroups.map((collection) => `
                    <article class="collection-link-card collection-preview-card" data-collection="${escapeHtml(collection.name)}">
                        <button class="collection-preview-toggle" type="button" aria-expanded="false">
                            <span>
                                <strong>${escapeHtml(collection.short_name || collection.name)}</strong>
                                <small>${collection.products.length} ${collection.products.length > 1 ? "articles" : "article"}</small>
                            </span>
                            <i class="fas fa-arrow-right" aria-hidden="true"></i>
                        </button>
                        <div class="collection-preview-products" hidden>
                            ${collection.products.map((product) => renderCollectionPreviewProduct(product)).join("")}
                        </div>
                    </article>
                `).join("")}
            </div>
        `;

        collectionProductsGrid.querySelectorAll(".collection-preview-toggle").forEach((button) => {
            button.addEventListener("click", () => {
                const card = button.closest(".collection-preview-card");
                const preview = card?.querySelector(".collection-preview-products");
                if (!preview) return;
                const isOpen = !preview.hidden;
                preview.hidden = isOpen;
                button.setAttribute("aria-expanded", String(!isOpen));
                card.classList.toggle("open", !isOpen);
            });
        });
    }

    function renderCollectionPreviewProduct(product) {
        const images = getProductCardImages(product);
        const image = images[0] || "img/logo.jpg";
        const productUrl = getProductUrl(product);
        return `
            <a class="collection-preview-product" href="${productUrl}">
                <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='img/logo.jpg';" />
                <span>${escapeHtml(formatProductName(product))}</span>
            </a>
        `;
    }

    function renderProductCard(product) {
        const category = product.category || "tshirt";
        const label = product.category_label || formatCategory(category);
        const images = getProductCardImages(product);
        const image = images[0] || "img/logo.jpg";
        const secondaryImage = images[1] || "";
        const price = Number(product.price || 0);
        const displayName = formatProductName(product);
        const collectionName = canonicalCollectionName(product.collection_name);
        const subcollectionName = product.subcollection_name || "";
        const productUrl = getProductUrl(product);

        return `
            <article class="product-card"
                data-category="${escapeHtml(category)}"
                data-collection="${escapeHtml(collectionName)}"
                data-subcollection="${escapeHtml(subcollectionName)}"
                data-name="${escapeHtml(displayName)}"
                data-price="${price}"
                data-description="${escapeHtml(product.description || "")}">
                <a class="product-media" href="${productUrl}" aria-label="Commander ${escapeHtml(product.name)}">
                    <img class="product-image-primary" src="${escapeHtml(image)}" alt="${escapeHtml(product.name)} - avant" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='img/logo.jpg';" />
                    ${secondaryImage ? `<img class="product-image-secondary" src="${escapeHtml(secondaryImage)}" alt="${escapeHtml(product.name)} - arriere" loading="lazy" decoding="async" onerror="this.remove();" />` : ""}
                    <span>${escapeHtml(label)}</span>
                    ${collectionName ? `<span class="product-collection-badge">${escapeHtml(collectionName)}</span>` : ""}
                    ${product.video_url ? '<span class="product-video-badge">Video</span>' : ""}
                </a>
                <div class="product-info">
                    <p class="product-category">${escapeHtml(label)}</p>
                    <h3>${escapeHtml(displayName)}</h3>
                    ${product.color ? `<p class="product-color">${renderColorSwatch(product.color)}${escapeHtml(product.color)}</p>` : '<p class="product-color product-color-placeholder" aria-hidden="true">&nbsp;</p>'}
                    ${renderProductSizes(product.sizes)}
                    <p>${escapeHtml(product.description || "")}</p>
                    <div class="product-footer">
                        <strong>${formatPrice(price)}</strong>
                        <div class="product-actions">
                            <a class="btn-details" href="${productUrl}">Details</a>
                            <button class="btn-cart" type="button"
                                data-id="${escapeHtml(product.id || product.name)}"
                                data-name="${escapeHtml(product.name)}"
                                data-price="${price}"
                                data-image="${escapeHtml(image)}"
                                data-category="${escapeHtml(category)}"
                                data-collection="${escapeHtml(collectionName)}"
                                data-subcollection="${escapeHtml(subcollectionName)}"
                                data-color="${escapeHtml(product.color || detectColor(product.name))}"
                                aria-label="Ajouter ${escapeHtml(product.name)}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    function getProductCardImages(product) {
        const primary = normalizeMediaUrl(product.image_url || product.image || "img/logo.jpg");
        const extraImages = normalizeProductImageList(product.image_urls || product.images);
        const images = [primary, ...extraImages]
            .map(normalizeMediaUrl)
            .filter(Boolean);
        return Array.from(new Set(images));
    }

    function getProductUrl(product) {
        return `product.html?id=${encodeURIComponent(product.id || product.name)}`;
    }

    function renderProductSizes(value) {
        const sizes = parseProductSizes(value);
        if (!sizes.length) return "";
        return `<p class="product-sizes" aria-label="Tailles disponibles">${sizes.map((size) => `<span>${escapeHtml(size)}</span>`).join("")}</p>`;
    }

    function parseProductSizes(value) {
        if (Array.isArray(value)) return Array.from(new Set(value.map(normalizeText).filter(Boolean)));
        if (!value) return [];
        if (typeof value === "string") {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) || parsed && typeof parsed === "object") return parseProductSizes(parsed);
                if (typeof parsed === "string" && parsed !== value) return parseProductSizes(parsed);
            } catch {
                return Array.from(new Set(value.split(/\r?\n|,/).map(normalizeText).filter(Boolean)));
            }
        }
        if (typeof value === "object") {
            const source = Array.isArray(value.sizes) ? value.sizes : Object.values(value);
            return parseProductSizes(source);
        }
        return [];
    }

    function normalizeProductImageList(value) {
        if (Array.isArray(value)) return value;
        if (!value) return [];
        if (typeof value === "string") {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed;
            } catch {
                if (value.includes("\n")) return value.split(/\r?\n/);
                if (!value.trim().startsWith("data:") && value.includes(",")) return value.split(",");
                return [value];
            }
        }
        return [];
    }

    function renderIncomingProducts(products) {
        if (!arrivalsGrid) return;
        const activeProducts = (products || []).filter((product) => product && (product.is_active ?? true));
        if (!activeProducts.length) {
            arrivalsGrid.innerHTML = `
                <article class="product-empty">
                    <i class="fas fa-box-open"></i>
                    <p>Aucun arrivage annonce pour le moment.</p>
                </article>
            `;
            return;
        }

        arrivalsGrid.innerHTML = activeProducts.map((product) => {
            const category = product.category || "tshirt";
            const label = product.category_label || formatCategory(category);
            const image = normalizeMediaUrl(product.image_url || product.image || "img/logo.jpg");
            const price = Number(product.price || 0);
            const displayName = formatProductName(product);
            const releaseDate = product.release_label || formatReleaseDate(product.release_date);

            return `
                <article class="product-card arrival-card">
                    <div class="product-media arrival-media" aria-label="${escapeHtml(displayName)} bientot disponible">
                        <img src="${escapeHtml(image)}" alt="${escapeHtml(displayName)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='img/logo.jpg';" />
                        <span>${escapeHtml(label)}</span>
                        <a class="arrival-cta" href="#arrivals" aria-label="Voir la section arrivage">
                            Bientot disponible
                        </a>
                    </div>
                    <div class="product-info">
                        <p class="product-category">Arrivage en cours</p>
                        <h3>${escapeHtml(displayName)}</h3>
                        ${product.color ? `<p class="product-color">${renderColorSwatch(product.color)}${escapeHtml(product.color)}</p>` : '<p class="product-color product-color-placeholder" aria-hidden="true">&nbsp;</p>'}
                        ${renderProductSizes(product.sizes)}
                        <p>${escapeHtml(product.description || "")}</p>
                        <div class="product-footer">
                            <strong>${price ? formatPrice(price) : "Prix a venir"}</strong>
                            ${releaseDate ? `<span class="arrival-date">${escapeHtml(releaseDate)}</span>` : ""}
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    }

            // Filtres boutique : categorie, collection, recherche et sous-collection.
            function applyProductFilter() {
        const query = normalizeText(productSearch?.value || "").toLowerCase();
        let visibleCount = 0;
        const cards = document.querySelectorAll("#productsGrid .product-card");

        cards.forEach((card) => {
            const matchCategory = activeProductFilter.category === "all" || card.dataset.category === activeProductFilter.category;
            const matchCollection = !activeProductFilter.collection || card.dataset.collection === activeProductFilter.collection;
            const matchSubcollection = !activeProductFilter.subcollection || card.dataset.subcollection === activeProductFilter.subcollection;
            const searchableText = [
                card.dataset.name,
                card.dataset.collection,
                card.dataset.subcollection,
                card.dataset.description,
                card.dataset.category,
            ].join(" ").toLowerCase();
            const matchSearch = !query || searchableText.includes(query);
            const isVisible = matchCategory && matchCollection && matchSubcollection && matchSearch;

            card.classList.toggle("hidden", !isVisible);
            if (isVisible) visibleCount += 1;
        });

        if (shopResults) {
            const suffix = visibleCount > 1 ? "articles affiches" : "article affiche";
            shopResults.textContent = cards.length ? `${visibleCount} ${suffix}` : "";
        }
    }

    function renderVideos(videos, isLoading = false, error = "") {
        if (!videosGrid) return;

        if (isLoading && !videos.length) {
            videosGrid.innerHTML = `
                <article class="video-empty">
                    <i class="fas fa-video"></i>
                    <p>Chargement des videos...</p>
                </article>
            `;
            return;
        }

        if (!videos.length) {
            videosGrid.innerHTML = `
                <article class="video-empty">
                    <i class="fas fa-video"></i>
                    <p>${escapeHtml(error || "Les videos de House of Redemption arrivent bientot.")}</p>
                </article>
            `;
            return;
        }

        videosGrid.innerHTML = videos.map((video) => `
            <article class="video-card">
                <div class="video-frame">
                    ${renderVideoMedia(video.video_url || video.url)}
                </div>
                <div class="video-info">
                    <p class="eyebrow">${escapeHtml(video.category || "House of Redemption")}</p>
                    <h3>${escapeHtml(video.title || "Video Redemption")}</h3>
                    <p>${escapeHtml(video.description || "")}</p>
                </div>
            </article>
        `).join("");
    }

    function renderVideoMedia(url) {
        const mediaUrl = normalizeMediaUrl(url);
        const embedUrl = toEmbedUrl(mediaUrl);

        if (!mediaUrl) return `<div class="video-placeholder"><i class="fas fa-play"></i></div>`;

        if (embedUrl) {
            return `<iframe src="${escapeHtml(embedUrl)}" title="Video House of Redemption" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        }

        if (/^(data:video\/|https?:\/\/.+\.(mp4|webm|ogg|mov)(\?.*)?$)/i.test(mediaUrl)) {
            return `<video src="${escapeHtml(mediaUrl)}" controls playsinline preload="metadata"></video>`;
        }

        return `
            <a class="video-link" href="${escapeHtml(mediaUrl)}" target="_blank" rel="noopener">
                <i class="fas fa-play"></i>
                <span>Voir la video</span>
            </a>
        `;
    }

    function toEmbedUrl(url) {
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes("youtube.com")) {
                const parts = parsed.pathname.split("/").filter(Boolean);
                const id = parsed.searchParams.get("v") || parts.find((part) => !["shorts", "embed", "live"].includes(part)) || parts[parts.length - 1];
                return id ? `https://www.youtube.com/embed/${id}` : "";
            }
            if (parsed.hostname.includes("youtu.be")) {
                const id = parsed.pathname.split("/").filter(Boolean)[0];
                return id ? `https://www.youtube.com/embed/${id}` : "";
            }
            if (parsed.hostname.includes("vimeo.com")) {
                const id = parsed.pathname.split("/").filter(Boolean).pop();
                return id ? `https://player.vimeo.com/video/${id}` : "";
            }
            if (parsed.hostname.includes("facebook.com") || parsed.hostname.includes("fb.watch")) {
                return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=734`;
            }
        } catch {
            return "";
        }
        return "";
    }

    function normalizeMediaUrl(value) {
        const url = normalizeText(value);
        if (!url) return "";
        if (/^(data:|blob:|\/|\.\/|\.\.\/)/i.test(url)) return url;
        const withProtocol = url.startsWith("www.") ? `https://${url}` : url;
        try {
            const parsed = new URL(withProtocol);
            if (parsed.hostname.includes("drive.google.com")) {
                const parts = parsed.pathname.split("/").filter(Boolean);
                const fileIndex = parts.indexOf("file");
                const id = parsed.searchParams.get("id") || (fileIndex >= 0 ? parts[fileIndex + 2] : "");
                return id ? `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}` : withProtocol;
            }
            if (parsed.hostname.includes("dropbox.com")) {
                parsed.searchParams.set("raw", "1");
                return parsed.toString();
            }
        } catch {
            return withProtocol;
        }
        return withProtocol;
    }

    function formatCategory(category) {
        return {
            tshirt: "T-shirt",
            hoodie: "Pull",
            longsleeve: "T-shirt manches longues",
            cap: "Casquette",
        }[category] || "Produit";
    }

    function parseSubcollections(value) {
        if (Array.isArray(value)) return value.filter(Boolean);
        if (!value) return [];
        if (typeof value === "string") {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch {
                return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
            }
        }
        return [];
    }

    function formatProductName(product) {
        const base = product.name || "Produit";
        const category = formatCategory(product.category);
        const hasCategory = base.toLowerCase().includes(category.toLowerCase());
        return `${hasCategory ? "" : `${category} `}${base}`.trim();
    }

    function detectColor(value) {
        const text = String(value || "").toLowerCase();
        const colors = ["noir", "noire", "bleu", "vert", "verte", "beige", "blanc", "rouge", "gris", "marron"];
        return colors.find((color) => text.includes(color)) || "";
    }

    function renderColorSwatch(color) {
        const value = colorHex(color);
        return `<span class="site-color-swatch" style="--swatch: ${escapeHtml(value)}" aria-hidden="true"></span>`;
    }

    function colorHex(color) {
        const key = String(color || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return {
            noir: "#111111",
            noire: "#111111",
            blanc: "#ffffff",
            blanche: "#ffffff",
            rouge: "#7d6a38",
            vert: "#1f7a3f",
            verte: "#1f7a3f",
            bleu: "#254331",
            beige: "#d8c3a5",
            gris: "#737373",
            marron: "#7c4a2d",
            turquoise: "#14b8a6",
            jaune: "#f2c94c",
        }[key] || "#d8c3a5";
    }

    // Sauvegarde metier : commandes, messages, newsletter et paiements Wave.
    async function saveOrder(order) {
        saveLocalRecord("redemption_orders", order);

        return savePublicRecord(ORDERS_TABLE, order, "commande");
    }

    async function saveContactMessage(message) {
        saveLocalRecord("redemption_contact_messages", message);

        return savePublicRecord(CONTACT_MESSAGES_TABLE, message, "message");
    }

    async function saveNewsletterSubscriber(subscriber) {
        saveLocalRecord("redemption_newsletter_subscribers", subscriber);

        return savePublicRecord(NEWSLETTER_TABLE, subscriber, "newsletter");
    }

    async function saveWavePayment(payment) {
        saveLocalRecord("redemption_wave_payments", payment);
        return savePublicRecord(WAVE_PAYMENTS_TABLE, payment, "paiement Wave");
    }

    function scheduleAbandonedCheckoutSave(status = "open") {
        window.clearTimeout(abandonedCheckoutTimer);
        abandonedCheckoutTimer = window.setTimeout(() => {
            captureAbandonedCheckout(status);
        }, 900);
    }

    async function captureAbandonedCheckout(status = "open") {
        if (!orderPanel || !cart.length) return null;
        const formData = getCheckoutFormData();
        const hasContact = [formData.firstName, formData.lastName, formData.email, formData.phone, formData.address]
            .some((value) => String(value || "").trim());
        if (!hasContact && status === "open") return null;

        if (!abandonedCheckoutId) {
            abandonedCheckoutId = `abandoned-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
            sessionStorage.setItem("redemption_abandoned_checkout_id", abandonedCheckoutId);
        }

        const now = new Date().toISOString();
        const record = {
            id: abandonedCheckoutId,
            first_name: formData.firstName || "",
            last_name: formData.lastName || "",
            email: formData.email || "",
            phone: formData.phone || "",
            address: formData.address || "",
            items: cart,
            total: cart.reduce((sum, item) => sum + Number(item.price || 0), 0),
            status,
            source: "checkout",
            created_at: readAbandonedCheckoutCreatedAt(abandonedCheckoutId) || now,
            updated_at: now,
        };

        upsertLocalRecord("redemption_abandoned_checkouts", record, "id");
        await upsertPublicRecord(ABANDONED_CHECKOUTS_TABLE, record, "panier abandonne");

        if (status === "converted") {
            sessionStorage.removeItem("redemption_abandoned_checkout_id");
            abandonedCheckoutId = "";
        }
        return record;
    }

    function readAbandonedCheckoutCreatedAt(id) {
        const existing = readJson("redemption_abandoned_checkouts", []).find((item) => String(item.id) === String(id));
        return existing?.created_at || "";
    }

    async function savePublicRecord(type, payload, label) {
        try {
            const response = await withTimeout(fetch(API_BASE, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ type, payload }),
            }), 15000);

            if (!response) return insertPublicRecordDirect(type, payload, label, `La requete ${label} a expire.`);
            if (!response.ok) return insertPublicRecordDirect(type, payload, label, `Erreur API ${label}: HTTP ${response.status}`);
            return { saved: true };
        } catch (error) {
            console.error(`API ${label} insert failed:`, error);
            return insertPublicRecordDirect(type, payload, label, `Erreur API ${label}.`);
        }
    }

    // Envoi rapide avant redirection : ne bloque pas l'ouverture de la page Wave.
    function sendPublicRecordFast(type, payload) {
        try {
            const body = JSON.stringify({ type, payload });
            if (navigator.sendBeacon) {
                const sent = navigator.sendBeacon(API_BASE, new Blob([body], { type: "application/json" }));
                if (sent) return;
            }
            fetch(API_BASE, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body,
                keepalive: true,
            }).catch((error) => {
                console.warn("Synchronisation rapide impossible:", error);
            });
        } catch (error) {
            console.warn("Preparation de la synchronisation rapide impossible:", error);
        }
    }

    async function upsertPublicRecord(table, payload, label) {
        const config = getSupabaseConfig();
        if (!config.url || !config.anonKey) return { saved: false, error: `Supabase non configure pour ${label}.` };
        try {
            const response = await withTimeout(fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`, {
                method: "POST",
                cache: "no-store",
                headers: {
                    apikey: config.anonKey,
                    authorization: `Bearer ${config.anonKey}`,
                    "content-type": "application/json",
                    prefer: "resolution=merge-duplicates,return=minimal",
                },
                body: JSON.stringify(payload),
            }), 12000);
            if (!response) return { saved: false, error: `La requete ${label} a expire.` };
            return { saved: response.ok, error: response.ok ? "" : `Erreur Supabase ${label}: HTTP ${response.status}` };
        } catch (error) {
            console.error(`Supabase upsert ${label} failed:`, error);
            return { saved: false, error: `Erreur Supabase ${label}.` };
        }
    }

    async function insertPublicRecordDirect(table, payload, label, apiError) {
        const config = getSupabaseConfig();
        const allowedTables = new Set([ORDERS_TABLE, CONTACT_MESSAGES_TABLE, NEWSLETTER_TABLE, WAVE_PAYMENTS_TABLE, ABANDONED_CHECKOUTS_TABLE]);
        if (!allowedTables.has(table) || !config.url || !config.anonKey) {
            return { saved: false, error: apiError };
        }

        try {
            const response = await withTimeout(fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`, {
                method: "POST",
                cache: "no-store",
                headers: {
                    apikey: config.anonKey,
                    authorization: `Bearer ${config.anonKey}`,
                    "content-type": "application/json",
                    prefer: "return=minimal",
                },
                body: JSON.stringify(payload),
            }), 15000);

            if (!response) return { saved: false, error: `La requete ${label} a expire.` };
            if (!response.ok) return { saved: false, error: `Erreur Supabase ${label}: HTTP ${response.status}` };
            return { saved: true };
        } catch (error) {
            console.error(`Supabase direct ${label} insert failed:`, error);
            return { saved: false, error: apiError };
        }
    }

    // Stockage local : garde une copie navigateur quand le reseau est indisponible.
    function saveLocalRecord(key, record) {
        const records = JSON.parse(localStorage.getItem(key) || "[]");
        records.unshift(record);
        localStorage.setItem(key, JSON.stringify(records));
    }

    function safeSaveLocalRecord(key, record) {
        try {
            saveLocalRecord(key, record);
        } catch (error) {
            console.warn(`Local save failed for ${key}:`, error);
        }
    }

    function safeLocalSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn(`Local storage failed for ${key}:`, error);
        }
    }

    function safeSessionSet(key, value) {
        try {
            sessionStorage.setItem(key, value);
        } catch (error) {
            console.warn(`Session storage failed for ${key}:`, error);
        }
    }

    function upsertLocalRecord(key, record, idKey = "id") {
        const records = readJson(key, []);
        const index = records.findIndex((item) => String(item[idKey]) === String(record[idKey]));
        if (index >= 0) {
            records[index] = { ...records[index], ...record };
        } else {
            records.unshift(record);
        }
        localStorage.setItem(key, JSON.stringify(records));
    }

    function renderGallery() {
        if (!galleryGrid) return;
        if (galleryRendered) return;
        galleryRendered = true;
        galleryGrid.innerHTML = "";

        galleryCandidates.forEach((name, index) => {
            const figure = document.createElement("figure");
            const image = document.createElement("img");
            const caption = document.createElement("figcaption");

            figure.className = "gallery-item";
            image.src = `img/${encodeURI(name)}`;
            image.alt = `Image Redemption ${index + 1}`;
            image.loading = "lazy";
            image.decoding = "async";
            caption.textContent = `Redemption ${String(index + 1).padStart(2, "0")}`;

            image.onerror = () => figure.remove();
            figure.append(image, caption);
            galleryGrid.appendChild(figure);
        });
    }

    function openGallery() {
        if (!galleryGrid) return;
        renderGallery();
        galleryGrid.hidden = false;
        galleryToggle?.setAttribute("aria-expanded", "true");
        galleryToggle?.classList.add("open");
    }

    function initRevealAnimations() {
        const targets = document.querySelectorAll("main section, .marquee, .product-card, .story-grid article, .values-grid article, .newsletter-section, .legal-grid article");

        targets.forEach((target) => target.classList.add("reveal"));

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        targets.forEach((target) => observer.observe(target));
    }

    function readCart() {
        try {
            return JSON.parse(localStorage.getItem("redemption_cart")) || [];
        } catch {
            return [];
        }
    }

    function formatPrice(price) {
        return `${price.toLocaleString("fr-FR")} FCFA`;
    }

    function formatReleaseDate(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return `Disponible le ${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long" }).format(date)}`;
    }

    function showToast(message) {
        if (!toast) return;
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.classList.add("show");
        toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
    }

    function createPaymentReference() {
        const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
        return `HOR-WAVE-${Date.now().toString(36).toUpperCase()}-${randomPart}`;
    }

    function initNotificationButton() {
        if (!notifyBtn) return;
        notifyBtn.hidden = !("Notification" in window);
        updateNotificationButton();
        if (localStorage.getItem("redemption_notifications_enabled") === "true") {
            enableProductNotifications(false);
        }
    }

    function updateNotificationButton() {
        if (!notifyBtn || !("Notification" in window)) return;
        const granted = Notification.permission === "granted";
        notifyBtn.classList.toggle("active", granted);
        notifyBtn.setAttribute("aria-label", granted ? "Notifications activees" : "Activer les notifications");
    }

    async function enableProductNotifications(userTriggered = false) {
        if (!("Notification" in window)) {
            if (userTriggered) showToast("Les notifications ne sont pas disponibles sur ce navigateur.");
            return false;
        }

        let permission = Notification.permission;
        if (permission === "default" && userTriggered) {
            permission = await Notification.requestPermission();
        }

        if (permission === "granted") {
            localStorage.setItem("redemption_notifications_enabled", "true");
            updateNotificationButton();
            if (userTriggered) {
                playNotificationSound();
                showToast("Notifications activees. Tu recevras les nouveautes de la boutique.");
            }
            return true;
        }

        updateNotificationButton();
        if (userTriggered) {
            showToast(permission === "denied"
                ? "Notifications bloquees. Active-les dans les reglages du navigateur."
                : "Clique sur Autoriser pour recevoir les nouveautes.");
        }
        return false;
    }

    function startProductUpdateWatch() {
        if (productRefreshTimer) return;
        productRefreshTimer = window.setInterval(() => {
            if (document.hidden) return;
            loadProducts();
            loadIncomingProducts();
        }, 60000);

    }

    function syncCatalogNotifications(items, storageKey, itemLabel) {
        const activeItems = (items || []).filter((item) => item?.is_active !== false);
        const fingerprint = activeItems
            .map((item) => [
                item.id || item.name,
                item.created_at || "",
                item.updated_at || "",
                item.name || "",
                item.price || 0,
                item.image_url || "",
                Array.isArray(item.image_urls) ? item.image_urls.join(",") : item.image_urls || "",
            ].join("|"))
            .sort()
            .join("::");
        const ids = activeItems.map((item) => String(item.id || item.name)).filter(Boolean);
        const previous = readJson(storageKey, null);
        const current = { fingerprint, ids, checked_at: new Date().toISOString() };

        if (!previous || previous.fingerprint === fingerprint) {
            localStorage.setItem(storageKey, JSON.stringify(current));
            return;
        }

        const previousIds = new Set(previous.ids || []);
        const newest = activeItems
            .filter((item) => !previousIds.has(String(item.id || item.name)))
            .sort((a, b) => getItemTime(b) - getItemTime(a))[0];
        const isNewItem = Boolean(newest);
        const title = isNewItem
            ? `Nouveau ${itemLabel} disponible`
            : "Boutique mise a jour";
        const body = isNewItem
            ? `${formatProductName(newest)} est maintenant sur House of Redemption.`
            : "Des produits ont ete modifies sur House of Redemption.";
        const url = isNewItem && itemLabel === "produit"
            ? getProductUrl(newest)
            : "#shop";

        localStorage.setItem(storageKey, JSON.stringify(current));
        notifyCatalogUpdate(title, body, url);
    }

    async function notifyCatalogUpdate(title, body, url = "#shop") {
        playNotificationSound();
        showToast(body);

        if (!("Notification" in window) || Notification.permission !== "granted") return;

        const notificationOptions = {
            body,
            icon: "img/logo.jpg",
            badge: "img/logo.jpg",
            tag: `redemption-${Date.now()}`,
            data: { url },
            vibrate: [120, 80, 120],
        };

        try {
            const registration = await navigator.serviceWorker?.ready;
            if (registration?.showNotification) {
                registration.showNotification(title, notificationOptions);
                return;
            }
        } catch {
            // Fall back to a page notification below.
        }

        try {
            const notification = new Notification(title, notificationOptions);
            notification.onclick = () => {
                window.focus();
                if (url) window.location.assign(url);
            };
        } catch {
            // Some browsers only allow notifications through the service worker.
        }
    }

    async function notifySiteUpdateAvailable() {
        const enabled = localStorage.getItem("redemption_notifications_enabled") === "true";
        const installed = localStorage.getItem("redemption_app_installed") === "true" || isStandaloneApp();
        if (!enabled && !installed) return;

        await notifyCatalogUpdate(
            "House of Redemption mis a jour",
            "Une nouvelle mise a jour est disponible sur la boutique.",
            "/"
        );
    }

    function prepareNotificationSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const context = new AudioContext();
            context.resume?.();
            window.setTimeout(() => context.close?.(), 250);
        } catch {
            // Audio unlock is best-effort.
        }
    }

    function playNotificationSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const context = new AudioContext();
            const gain = context.createGain();
            gain.gain.setValueAtTime(0.0001, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
            gain.connect(context.destination);
            [660, 880].forEach((frequency, index) => {
                const oscillator = context.createOscillator();
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.13);
                oscillator.connect(gain);
                oscillator.start(context.currentTime + index * 0.13);
                oscillator.stop(context.currentTime + 0.34 + index * 0.13);
            });
            window.setTimeout(() => context.close?.(), 800);
        } catch {
            // Sound can be blocked until the user interacts with the page.
        }
    }

    function getItemTime(item) {
        const time = new Date(item?.updated_at || item?.created_at || 0).getTime();
        return Number.isFinite(time) ? time : 0;
    }

    function readJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key)) || fallback;
        } catch {
            return fallback;
        }
    }

    function showUpdateButton() {
        if (!updateAppBtn) return;
        updateAppBtn.hidden = true;
        updateAppBtn.textContent = "Mettre a jour l'application";
        const message = "Nouvelle mise a jour disponible. La boutique va l'appliquer automatiquement.";
        showToast(message);
    }

    function normalizeFormData(formData) {
        return Object.fromEntries(
            Object.entries(formData).map(([key, value]) => [key, normalizeText(value)])
        );
    }

    // Commande : lecture normalisee des champs du formulaire de finalisation.
    function getCheckoutFormData() {
        return {
            firstName: getCheckoutFieldValue("firstName"),
            lastName: getCheckoutFieldValue("lastName"),
            email: getCheckoutFieldValue("email"),
            phone: getCheckoutFieldValue("phone"),
            deliveryCommune: getCheckoutFieldValue("deliveryCommune"),
            deliveryDistrict: getCheckoutFieldValue("deliveryDistrict"),
            address: getCheckoutFieldValue("address"),
            latitude: getCheckoutFieldValue("latitude"),
            longitude: getCheckoutFieldValue("longitude"),
            locationAccuracy: getCheckoutFieldValue("locationAccuracy"),
            payment: "wave",
            shareLocation: getCheckoutField("shareLocation")?.checked ? "on" : "",
        };
    }

    function blockNativeValidation(event) {
        event?.preventDefault?.();
        event?.stopImmediatePropagation?.();
        event?.stopPropagation?.();
        disableNativeValidation(document);
    }

    function disableNativeValidation(root = document) {
        root.querySelectorAll?.("form").forEach((form) => {
            form.noValidate = true;
            form.setAttribute("novalidate", "novalidate");
        });
        root.querySelectorAll?.("input, select, textarea, button").forEach((element) => {
            element.removeAttribute("required");
            element.removeAttribute("pattern");
            element.removeAttribute("min");
            element.removeAttribute("max");
            element.removeAttribute("minlength");
            element.removeAttribute("maxlength");
            element.removeAttribute("formnovalidate");
            element.required = false;
            element.setCustomValidity?.("");
            if (element.type === "submit" && element.closest?.("#orderPanel")) {
                element.type = "button";
            }
        });
    }

    function getCheckoutField(name) {
        return orderPanel?.querySelector(`[name="${name}"]`);
    }

    function getCheckoutFieldValue(name) {
        return normalizeText(getCheckoutField(name)?.value || "");
    }

    function clearCheckoutFields() {
        orderPanel?.querySelectorAll("input, textarea, select").forEach((field) => {
            if (field.type === "checkbox" || field.type === "radio") {
                field.checked = false;
                return;
            }
            if (field.name === "payment") {
                field.value = "wave";
                return;
            }
            field.value = "";
        });
        resetDeliveryMap("Renseigne la commune et le quartier.");
    }

    function isElementVisible(element) {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
            return false;
        }
        const rects = element.getClientRects();
        return Boolean(rects.length);
    }

    // Validation commande : champs obligatoires et controle simple de l'email.
    function getFirstMissingCheckoutField(formData) {
        const requiredFields = [
            ["firstName", "Veuillez renseigner votre prenom."],
            ["lastName", "Veuillez renseigner votre nom."],
            ["phone", "Veuillez renseigner votre telephone."],
            ["deliveryCommune", "Veuillez renseigner la commune de livraison."],
            ["deliveryDistrict", "Veuillez renseigner le quartier ou repere de livraison."],
        ];
        const missing = requiredFields.find(([name]) => !formData[name]);
        if (missing) {
            return {
                message: missing[1],
                element: getCheckoutField(missing[0]),
            };
        }
        if (formData.email && formData.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            return {
                message: "Veuillez renseigner un email valide.",
                element: getCheckoutField("email"),
            };
        }
        return null;
    }

    function getCheckoutEmail(formData) {
        if (formData.email) return formData.email;
        const phoneKey = normalizeText(formData.phone).replace(/\D/g, "");
        return `client-${phoneKey || Date.now()}@houseofredemption.local`;
    }

    function buildDeliveryAddress(formData) {
        return [
            formData.deliveryCommune ? `Commune: ${formData.deliveryCommune}` : "",
            formData.deliveryDistrict ? `Quartier/repere: ${formData.deliveryDistrict}` : "",
            formData.address ? `Details: ${formData.address}` : "",
        ].filter(Boolean).join(" | ");
    }

    function scheduleDeliveryMapUpdate() {
        window.clearTimeout(deliveryGeocodeTimer);
        deliveryGeocodeTimer = window.setTimeout(updateDeliveryMapFromAddress, 650);
    }

    async function updateDeliveryMapFromAddress() {
        const formData = getCheckoutFormData();
        const query = getDeliveryMapQuery(formData);
        if (!formData.deliveryCommune || !formData.deliveryDistrict) {
            resetDeliveryMap("Renseigne la commune et le quartier.");
            return;
        }

        const requestId = ++deliveryGeocodeRequestId;
        showDeliveryMapStatus("Recherche de la position...");

        try {
            const location = await geocodeDeliveryAddress(query);
            if (requestId !== deliveryGeocodeRequestId) return;
            if (!location) {
                showDeliveryMapStatus("Position introuvable. Ajoute un repere plus precis.");
                return;
            }
            setCheckoutLocation(location, "Position estimee avec la commune et le quartier");
        } catch (error) {
            if (requestId !== deliveryGeocodeRequestId) return;
            showDeliveryMapStatus("Carte indisponible pour le moment. La commande reste possible.");
        }
    }

    function getDeliveryMapQuery(formData) {
        return [
            formData.address,
            formData.deliveryDistrict,
            formData.deliveryCommune,
            "Abidjan",
            "Cote d'Ivoire",
        ].filter(Boolean).join(", ");
    }

    async function geocodeDeliveryAddress(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ci&accept-language=fr&q=${encodeURIComponent(query)}`;
        const response = await withTimeout(fetch(url, { headers: { accept: "application/json" } }), 6000);
        if (!response || !response.ok) return null;
        const data = await response.json();
        const result = Array.isArray(data) ? data[0] : null;
        const latitude = Number(result?.lat);
        const longitude = Number(result?.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
        return {
            latitude,
            longitude,
            location_accuracy: null,
            location_captured_at: new Date().toISOString(),
        };
    }

    async function handleUseCurrentLocation() {
        const checkbox = getCheckoutField("shareLocation");
        if (checkbox) checkbox.checked = true;
        showDeliveryMapStatus("Autorisation GPS en attente...");
        const location = await getCustomerLocation(true);
        if (!location || !Object.keys(location).length) {
            showDeliveryMapStatus("GPS non autorise. La carte utilise la commune et le quartier.");
            return;
        }
        setCheckoutLocation(location, "Position GPS precise partagee par le client");
    }

    async function getCheckoutLocationPayload(formData) {
        const mapLocation = getCheckoutLocationFromFields(formData);
        if (formData.shareLocation !== "on") {
            if (Object.keys(mapLocation).length) return mapLocation;
            const geocodedLocation = await getDeliveryGeocodedLocation(formData);
            if (Object.keys(geocodedLocation).length) {
                setCheckoutLocation(geocodedLocation, "Position estimee avec la commune et le quartier");
            }
            return geocodedLocation;
        }

        const gpsLocation = await Promise.race([
            getCustomerLocation(true),
            new Promise((resolve) => window.setTimeout(() => resolve({}), 3500)),
        ]);
        if (gpsLocation && Object.keys(gpsLocation).length) {
            setCheckoutLocation(gpsLocation, "Position GPS precise partagee par le client");
            return gpsLocation;
        }
        if (Object.keys(mapLocation).length) return mapLocation;
        return getDeliveryGeocodedLocation(formData);
    }

    async function getDeliveryGeocodedLocation(formData) {
        if (!formData.deliveryCommune || !formData.deliveryDistrict) return {};
        const location = await geocodeDeliveryAddress(getDeliveryMapQuery(formData));
        return location || {};
    }

    function getCheckoutLocationFromFields(formData = getCheckoutFormData()) {
        const latitude = Number(formData.latitude);
        const longitude = Number(formData.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return {};
        const accuracy = Number(formData.locationAccuracy);
        return {
            latitude,
            longitude,
            ...(Number.isFinite(accuracy) ? { location_accuracy: accuracy } : {}),
            location_captured_at: new Date().toISOString(),
        };
    }

    function setCheckoutLocation(location, statusText) {
        const latitude = Number(location.latitude);
        const longitude = Number(location.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const accuracy = Number(location.location_accuracy);
        setCheckoutFieldValue("latitude", latitude.toFixed(7));
        setCheckoutFieldValue("longitude", longitude.toFixed(7));
        setCheckoutFieldValue("locationAccuracy", Number.isFinite(accuracy) ? String(Math.round(accuracy)) : "");

        if (deliveryMapPanel) deliveryMapPanel.hidden = false;
        if (deliveryMapFrame) {
            deliveryMapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=16&output=embed`;
        }
        if (deliveryMapStatus) deliveryMapStatus.textContent = statusText;
        if (deliveryCoordinates) {
            const accuracyLabel = Number.isFinite(accuracy) ? ` - precision ${Math.round(accuracy)} m` : "";
            deliveryCoordinates.textContent = `Latitude ${latitude.toFixed(6)} - Longitude ${longitude.toFixed(6)}${accuracyLabel}`;
        }
    }

    function setCheckoutFieldValue(name, value) {
        const field = getCheckoutField(name);
        if (field) field.value = value;
    }

    function showDeliveryMapStatus(message) {
        if (deliveryMapPanel) deliveryMapPanel.hidden = false;
        if (deliveryMapStatus) deliveryMapStatus.textContent = message;
    }

    function resetDeliveryMap(message) {
        setCheckoutFieldValue("latitude", "");
        setCheckoutFieldValue("longitude", "");
        setCheckoutFieldValue("locationAccuracy", "");
        if (deliveryMapFrame) deliveryMapFrame.removeAttribute("src");
        if (deliveryCoordinates) deliveryCoordinates.textContent = "";
        if (deliveryMapStatus) deliveryMapStatus.textContent = message;
        if (deliveryMapPanel) deliveryMapPanel.hidden = true;
    }

    function trackMetaEvent(eventName, params) {
        if (typeof window.redemptionTrackMeta !== "function") return;
        window.redemptionTrackMeta(eventName, params);
    }

    function normalizeText(value) {
        return String(value || "").trim().replace(/\s+/g, " ");
    }

    function canonicalCollectionName(value) {
        const text = normalizeText(value);
        const key = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (key === "collection couronne d'epine") return "Collection couronne d'épine";
        if (key === "collection rachat") return "Collection rachat";
        if (key === "collection evangeliste yann dayere (ev.yd)") return "Collection evangeliste Yann Dayere (Ev.YD)";
        return text;
    }

    // Geolocalisation optionnelle : aide la livraison mais ne bloque jamais le paiement.
    function getCustomerLocation(allowed = false) {
        if (!allowed || !navigator.geolocation) return Promise.resolve({});

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        location_accuracy: position.coords.accuracy,
                        location_captured_at: new Date(position.timestamp || Date.now()).toISOString(),
                    });
                },
                () => resolve({}),
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 60000,
                }
            );
        });
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
});

function setupClientSourceDeterrents() {
    document.addEventListener("contextmenu", (event) => event.preventDefault());
    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        const blocked =
            key === "f12" ||
            (event.ctrlKey && key === "u") ||
            (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
        if (blocked) event.preventDefault();
    }, true);
}
