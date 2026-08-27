/* ==========================================================================
   script.js — Real Platinum & Diamond Jewelry Studio PBR Engine
   ========================================================================== */

(function initJewelryEngine() {
    function waitForEngine() {
        if (typeof THREE === 'undefined' || typeof renderer === 'undefined' || !renderer || !scene) {
            setTimeout(waitForEngine, 100);
            return;
        }

        setupRealisticJewelryShader();
    }

    /* ---------------- 1. HIGH CONTRAST STUDIO DOME GENERATOR ---------------- */
    function createStudioEnvMap(targetRenderer) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Dark gradient studio backdrop
        const bg = ctx.createLinearGradient(0, 0, 0, 512);
        bg.addColorStop(0.0, '#3a3d45'); // Soft ambient top
        bg.addColorStop(0.3, '#1a1c23');
        bg.addColorStop(0.5, '#0d0814'); // Horizon contrast line (gives metals crisp edges)
        bg.addColorStop(0.8, '#1e1428');
        bg.addColorStop(1.0, '#050208');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1024, 512);

        // Overhead softbox light (pure white specular glint)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(512, 100, 240, 50, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left Vertical Studio Softbox Strip
        ctx.fillStyle = '#f0f6ff';
        ctx.fillRect(100, 120, 70, 220);

        // Right Vertical Studio Softbox Strip
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(840, 120, 80, 220);

        // Warm subtle rim glint
        ctx.fillStyle = '#ffb3c6';
        ctx.fillRect(400, 240, 220, 14);

        const panoTexture = new THREE.CanvasTexture(canvas);
        panoTexture.mapping = THREE.EquirectangularReflectionMapping;

        const pmremGenerator = new THREE.PMREMGenerator(targetRenderer);
        pmremGenerator.compileEquirectangularShader();
        const renderTarget = pmremGenerator.fromEquirectangular(panoTexture);
        pmremGenerator.dispose();

        return renderTarget.texture;
    }

    /* ---------------- 2. REALISTIC JEWELRY PBR SHADERS ---------------- */
    function setupRealisticJewelryShader() {
        // 1. Generate Environment Map for Main Room
        const mainEnvMap = createStudioEnvMap(renderer);
        scene.environment = mainEnvMap;

        // 2. Generate Independent Environment Map for Modal Renderer
        if (typeof ringViewerRenderer !== 'undefined' && ringViewerRenderer && ringViewerScene) {
            const modalEnvMap = createStudioEnvMap(ringViewerRenderer);
            ringViewerScene.environment = modalEnvMap;
        }

        // True Polished Platinum/White-Gold Material
        const platinumBandMaterial = new THREE.MeshStandardMaterial({
            color: 0xd8dde6,          // Lustrous Platinum Tone
            metalness: 1.0,           // 100% Mirror Metal
            roughness: 0.08,          // Mirror Smooth Polish
            envMapIntensity: 2.2,     // Crisp studio glints
            side: THREE.DoubleSide
        });

        // Brilliant Diamond / Gemstone Material
        const gemstoneMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.05,
            roughness: 0.0,
            transmission: 0.95,       // Glass/Diamond refractive body
            opacity: 1.0,
            transparent: true,
            ior: 2.417,               // Real Diamond Refractive Index
            reflectivity: 0.9,
            envMapIntensity: 3.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0
        });

        // Auto-assign materials to ring meshes (preserves gemstone if present)
        const applyJewelryShaders = (rootObj) => {
            if (!rootObj) return;
            rootObj.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry && child.geometry.attributes.color) {
                        child.geometry.deleteAttribute('color');
                    }
                    const name = (child.name || '').toLowerCase();
                    if (name.includes('diamond') || name.includes('gem') || name.includes('stone') || name.includes('crystal')) {
                        child.material = gemstoneMaterial.clone();
                    } else {
                        child.material = platinumBandMaterial.clone();
                    }
                    child.material.needsUpdate = true;
                }
            });
        };

        const intervalId = setInterval(() => {
            if (typeof ringGroup !== 'undefined' && ringGroup) applyJewelryShaders(ringGroup);
            if (typeof ringViewerMesh !== 'undefined' && ringViewerMesh) applyJewelryShaders(ringViewerMesh);
        }, 150);
        setTimeout(() => clearInterval(intervalId), 6000);
    }

    waitForEngine();
})();
