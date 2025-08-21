document.addEventListener("DOMContentLoaded", () => {
    // --- Récupération des éléments DOM ---
    const resultContainer = document.querySelector(".result-container");
    const personalCheckbox = document.getElementById("personal");
    const customCharPool = document.getElementById("customPool");
    const optionsDiv = document.querySelector(".options");
    const customPoolLabel = document.querySelector("label[for='customPool']");
    const generateBtn = document.getElementById("generateBtn");
    const outputEl = document.getElementById("output");
    const entropyEl = document.getElementById("entropy");
    const entropyBarFill = document.querySelector(".entropy-bar-fill");

    // --- Fonction pour générer le mot de passe ---
    async function generatePassword(masterPassword, siteName, length = 16, personal = false, customCharPool = "", useLowercase = true, useDigits = true, useUppercase = true, useSpecialChars = true) {
        if (length < 1 || length > 99) return "Longueur invalide";

        const input = masterPassword + "|" + siteName;
        const salt = new TextEncoder().encode("M#Pass6@");
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(input),
            { name: "PBKDF2" },
            false,
            ["deriveBits"]
        );
        const hashBuffer = await crypto.subtle.deriveBits(
            { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
            keyMaterial,
            256
        );
        const hash = Array.from(new Uint8Array(hashBuffer));

        const lowercase = [..."abcdefghijklmnopqrstuvwxyz"];
        const digits = [..."0123456789"];
        const uppercase = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
        const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];

        let charPool = [];
        if (!personal) {
            if (useLowercase) charPool = charPool.concat(lowercase);
            if (useDigits) charPool = charPool.concat(digits);
            if (useUppercase) charPool = charPool.concat(uppercase);
            if (useSpecialChars) charPool = charPool.concat(specialChars);
        }

        let passwordChars = [];

        if (charPool.length > 0 && !personal) {
            if (useLowercase) passwordChars.push(lowercase[hash[0] % lowercase.length]);
            if (useDigits && passwordChars.length < length) passwordChars.push(digits[hash[1] % digits.length]);
            if (useUppercase && passwordChars.length < length) passwordChars.push(uppercase[hash[2] % uppercase.length]);
            if (useSpecialChars && passwordChars.length < length) passwordChars.push(specialChars[hash[3] % specialChars.length]);

            for (let i = passwordChars.length; i < length; i++) {
                const byte1 = hash[i % hash.length];
                const byte2 = hash[(i + 1) % hash.length];
                const index = ((byte1 << 8) | byte2) % charPool.length;
                passwordChars.push(charPool[index]);
            }

            return passwordChars.map((c, i) => [c, hash[i % hash.length]])
                .sort((a, b) => a[1] - b[1])
                .map(x => x[0])
                .join('');
        }

        if (personal && customCharPool.trim() !== "") {
            const listCustom = [...customCharPool];
            let mandatoryChars = [];
            const lowercaseList = listCustom.filter(c => /[a-z]/.test(c));
            const uppercaseList = listCustom.filter(c => /[A-Z]/.test(c));
            const digitList = listCustom.filter(c => /[0-9]/.test(c));
            const specialList = listCustom.filter(c => /[^A-Za-z0-9]/.test(c));

            if (lowercaseList.length) mandatoryChars.push(lowercaseList[hash[0] % lowercaseList.length]);
            if (uppercaseList.length) mandatoryChars.push(uppercaseList[hash[1] % uppercaseList.length]);
            if (digitList.length) mandatoryChars.push(digitList[hash[2] % digitList.length]);
            if (specialList.length) mandatoryChars.push(specialList[hash[3] % specialList.length]);

            for (let i = mandatoryChars.length; i < length; i++) {
                passwordChars.push(listCustom[hash[i % hash.length] % listCustom.length]);
            }

            const combined = mandatoryChars.concat(passwordChars);
            return combined.map((c, i) => [c, hash[(i + 4) % hash.length]])
                .sort((a, b) => a[1] - b[1])
                .map(x => x[0])
                .slice(0, length)
                .join('');
        }

        return "Alphabet invalide";
    }

    function estimateEntropy(length, charPoolSize) {
        return Math.round(length * Math.log2(charPoolSize));
    }

    // --- Fonction pour cacher/afficher le résultat ---
    function updateResultVisibility() {
        if (outputEl.textContent.trim() !== "") {
            resultContainer.style.display = "block";
        } else {
            resultContainer.style.display = "none";
        }
    }

    // --- Fonction pour mettre à jour la barre d'entropie ---
function updateEntropyBar(entropy) {
    const fill = document.querySelector(".entropy-bar-fill");
    const maxEntropy = 140;

    // Clamp l'entropie
    const clamped = Math.max(0, Math.min(maxEntropy, entropy));
    const totalPercent = (clamped / maxEntropy) * 100;
    fill.style.width = totalPercent + "%";

    // Définition des couleurs et stops fixes en bits
    const colorStops = [
        { color: "#E53935", value: 0 },
        { color: "#FF9800", value: 28 },
        { color: "#FFEB3B", value: 35 },
        { color: "#4CAF50", value: 59 },
        { color: "#00BCD4", value: 127 },
        { color: "#004680", value: 140 } // bleu foncé si jamais on dépasse
    ];

    // Générer le gradient dynamique
    let gradientParts = [];
    for (let i = 0; i < colorStops.length; i++) {
        const stop = colorStops[i];

        // On ne dessine que les stops <= l'entropie actuelle
        if (stop.value <= clamped) {
            const stopPercent = (stop.value / clamped) * 100;
            gradientParts.push(`${stop.color} ${stopPercent}%`);
        } else {
            break; // stops supérieurs à l'entropie ne sont pas ajoutés
        }
    }

    // S'il n'y a aucun stop inférieur à clamped, mettre la première couleur
    if (gradientParts.length === 0) gradientParts.push(`${colorStops[0].color} 100%`);

    // Appliquer le gradient
    fill.style.background = `linear-gradient(to right, ${gradientParts.join(", ")})`;
}
















    // --- Gestion du clic sur Generate ---
    generateBtn.addEventListener("click", async () => {
        const master = document.getElementById("master").value;
        const site = document.getElementById("site").value;
        const length = parseInt(document.getElementById("length").value);
        const personal = personalCheckbox.checked;
        const customPoolVal = customCharPool.value;
        const useLowercase = document.getElementById("useLowercase").checked;
        const useUppercase = document.getElementById("useUppercase").checked;
        const useDigits = document.getElementById("useDigits").checked;
        const useSpecialChars = document.getElementById("useSpecialChars").checked;

        const pwd = await generatePassword(master, site, length, personal, customPoolVal, useLowercase, useDigits, useUppercase, useSpecialChars);
        outputEl.textContent = pwd;

        // Calcul de la taille du pool
        let poolSize = 0;
        if (personal && customPoolVal.trim() !== "") {
            poolSize = new Set(customPoolVal).size;
        } else {
            const standardChars = [];
            if (useLowercase) standardChars.push(...'abcdefghijklmnopqrstuvwxyz');
            if (useUppercase) standardChars.push(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
            if (useDigits) standardChars.push(...'0123456789');
            if (useSpecialChars) standardChars.push(...'!@#$%^&*()-_+=');
            poolSize = new Set(standardChars).size;
        }

        // Calcul de l'entropie
        let entropyValue = 0;
        if (!(length > 99 || length < 1 || poolSize <= 0)) {
        entropyValue = estimateEntropy(length, poolSize);

        // Déterminer le niveau de sécurité
        let strengthLabel = "";
        if (entropyValue < 28) strengthLabel = "Très faible🔴";
        else if (entropyValue < 36) strengthLabel = "Faible🟠";
        else if (entropyValue < 60) strengthLabel = "Modéré🟡";
        else if (entropyValue < 128) strengthLabel = "Fort🟢";
        else strengthLabel = "Très fort🔵";

        entropyEl.textContent = `${strengthLabel} - ${entropyValue} bits`;
    }


        // Mettre à jour la barre d'entropie
        const minEntropyThreshold = 0;
        const maxEntropyThreshold = 140;
        let targetProgress = 0;
        if (entropyValue >= minEntropyThreshold) {
            const entropyRange = maxEntropyThreshold - minEntropyThreshold;
            if (entropyRange > 0) {
                targetProgress = ((entropyValue - minEntropyThreshold) / entropyRange) * 100;
                targetProgress = Math.min(Math.max(targetProgress, 0), 100);
            }
        }
        updateEntropyBar(entropyValue);

        // Masquer ou afficher le résultat
        updateResultVisibility();

        showToast("Mot de passe généré !");
    });

    // --- Gestion de l'affichage de l'option Custom Pool ---
    function updateButtonState() {
        customCharPool.style.display = personalCheckbox.checked ? "block" : "none";
        optionsDiv.style.display = personalCheckbox.checked ? "none" : "block";
        customPoolLabel.style.display = personalCheckbox.checked ? "block" : "none";
    }

    personalCheckbox.addEventListener("change", updateButtonState);
    updateButtonState();

    // --- Initialisation ---
    updateResultVisibility();

const masterPassword = document.getElementById("master");
  const siteName = document.getElementById("site");
  

  function checkFields() {
    // Le bouton est activé seulement si les 2 champs ne sont pas vides
    if (masterPassword.value.trim() !== "" && siteName.value.trim() !== "") {
      generateBtn.disabled = false;
    } else {
      generateBtn.disabled = true;
    }
  }

  // Vérifie à chaque frappe
  masterPassword.addEventListener("input", checkFields);
  siteName.addEventListener("input", checkFields);


  // Récupération des boutons
const copyBtn = document.getElementById("copy");
const defAsMasterBtn = document.getElementById("defAsMaster");

// Action pour le bouton "Copier"
copyBtn.addEventListener("click", () => {
  if (outputEl.textContent.trim() !== "") {
    navigator.clipboard.writeText(outputEl.textContent)
      .then(() => showToast("Mot de passe copié !"))
      .catch(err => console.error("Erreur de copie : ", err));
  }
});

// Action pour le bouton "Définir comme mot de passe maître"
defAsMasterBtn.addEventListener("click", () => {
  if (outputEl.textContent.trim() !== "") {
    masterPassword.value = outputEl.textContent; // on définit le champ master
    showToast("Défini comme mot de passe maître !");
  }
});

function showToast(message, duration = 2000) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    // Force un reflow pour activer la transition
    void toast.offsetWidth;

    toast.classList.add("show");

    // Supprime le toast après la durée
    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove());
    }, duration);
}


})