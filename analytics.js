(function () {
    const PIXEL_META_SELECTOR = 'meta[name="meta-pixel-id"]';
    const PIXEL_PLACEHOLDER = "REPLACE_WITH_META_PIXEL_ID";

    function onReady(callback) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", callback, { once: true });
            return;
        }
        callback();
    }

    function getPixelId() {
        const metaValue = document.querySelector(PIXEL_META_SELECTOR)?.content || "";
        const configuredValue = window.HOR_META_PIXEL_ID || metaValue;
        const pixelId = String(configuredValue || "").trim();
        if (!pixelId || pixelId === PIXEL_PLACEHOLDER) return "";
        return pixelId;
    }

    function setupMetaPixel() {
        const pixelId = getPixelId();
        if (!pixelId || window.fbq) return;

        window.fbq = function () {
            window.fbq.callMethod
                ? window.fbq.callMethod.apply(window.fbq, arguments)
                : window.fbq.queue.push(arguments);
        };
        window._fbq = window.fbq;
        window.fbq.push = window.fbq;
        window.fbq.loaded = true;
        window.fbq.version = "2.0";
        window.fbq.queue = [];

        const script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        document.head.appendChild(script);

        window.fbq("init", pixelId);
        window.fbq("track", "PageView");
    }

    window.redemptionTrackMeta = function (eventName, params) {
        if (typeof window.fbq !== "function") return;
        window.fbq("track", eventName, params || {});
    };

    function setupCursor() {
        if (window.redemptionCursorReady || !window.matchMedia("(pointer: fine)").matches) return;
        window.redemptionCursorReady = true;

        let cursorDot = document.getElementById("cursorDot");
        let cursorRing = document.getElementById("cursorRing");

        if (!cursorDot) {
            cursorDot = document.createElement("div");
            cursorDot.id = "cursorDot";
            cursorDot.className = "cursor-dot";
            cursorDot.setAttribute("aria-hidden", "true");
            document.body.appendChild(cursorDot);
        }

        if (!cursorRing) {
            cursorRing = document.createElement("div");
            cursorRing.id = "cursorRing";
            cursorRing.className = "cursor-ring";
            cursorRing.setAttribute("aria-hidden", "true");
            document.body.appendChild(cursorRing);
        }

        document.body.classList.add("custom-cursor-ready");

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;

        document.addEventListener("mousemove", function (event) {
            mouseX = event.clientX;
            mouseY = event.clientY;
            cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
        }, { passive: true });

        document.addEventListener("mouseover", function (event) {
            if (event.target.closest("a, button, input, select, textarea, .product-card, .product-gallery-thumb")) {
                cursorRing.classList.add("cursor-active");
            }
        });

        document.addEventListener("mouseout", function (event) {
            if (event.target.closest("a, button, input, select, textarea, .product-card, .product-gallery-thumb")) {
                cursorRing.classList.remove("cursor-active");
            }
        });

        function animateCursor() {
            ringX += (mouseX - ringX) * 0.16;
            ringY += (mouseY - ringY) * 0.16;
            cursorRing.style.transform = `translate(${ringX}px, ${ringY}px)`;
            requestAnimationFrame(animateCursor);
        }

        animateCursor();
    }

    onReady(function () {
        setupMetaPixel();
        setupCursor();
    });
})();
