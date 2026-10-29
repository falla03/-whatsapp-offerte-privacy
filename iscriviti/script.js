"use strict";

/* Configurazione Supabase: mantenuta invariata. */
const SUPABASE_URL = "https://onrpgdsykfjwlsuxbuxf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_C9rNHzuuVz8VYFc-M090UA_DpXi_3uL";
const TABLE_NAME = "Offerte conad";
const CONAD_PHONE_NUMBER = "+39 352 214 5048";

const signupForm = document.getElementById("signup-form");
const phoneInput = document.getElementById("phone");
const consentCheckbox = document.getElementById("privacy-consent");
const phoneError = document.getElementById("phone-error");
const consentError = document.getElementById("consent-error");
const confirmContactButton = document.getElementById("confirm-contact-button");
const submitError = document.getElementById("submit-error");
const instagramNotice = document.getElementById("instagram-notice");
const copyNumberButton = document.getElementById("copy-number-button");
const copyFeedback = document.getElementById("copy-feedback");

let normalizedPhone = null;
let consentTimestamp = null;
let isSubmitting = false;

function normalizeItalianPhone(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0039")) digits = digits.substring(4);
  if (digits.startsWith("39") && digits.length > 10) digits = digits.substring(2);
  if (!/^3\d{8,9}$/.test(digits)) return null;
  return `39${digits}`;
}

phoneInput.addEventListener("input", () => {
  let digits = phoneInput.value.replace(/\D/g, "");
  if (digits.startsWith("39") && digits.length > 10) digits = digits.substring(2);
  digits = digits.substring(0, 10);
  let formatted = digits;
  if (digits.length > 6) {
    formatted = `${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  } else if (digits.length > 3) {
    formatted = `${digits.substring(0, 3)} ${digits.substring(3)}`;
  }
  phoneInput.value = formatted;
  phoneError.textContent = "";
});

consentCheckbox.addEventListener("change", () => { consentError.textContent = ""; });

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  phoneError.textContent = "";
  consentError.textContent = "";
  const phone = normalizeItalianPhone(phoneInput.value);
  if (!phone) {
    phoneError.textContent = "Inserisci un numero di cellulare italiano valido.";
    phoneInput.focus();
    return;
  }
  if (!consentCheckbox.checked) {
    consentError.textContent = "Per continuare è necessario accettare l'informativa.";
    return;
  }
  normalizedPhone = phone;
  consentTimestamp = new Date().toISOString();
  showStep(2);
});

/* Il VCF rimane un link normale: i browser in-app possono limitarne l'apertura. */
if (/Instagram/i.test(navigator.userAgent || "")) {
  instagramNotice.hidden = false;
}

/* Copia il numero: clipboard moderna + fallback per browser in-app. */
copyNumberButton.addEventListener("click", async () => {
  let copied = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(CONAD_PHONE_NUMBER);
      copied = true;
    }
  } catch (error) {
    console.warn("Clipboard API non disponibile:", error);
  }

  if (!copied) {
    const temporaryInput = document.createElement("textarea");
    temporaryInput.value = CONAD_PHONE_NUMBER;
    temporaryInput.setAttribute("readonly", "");
    temporaryInput.style.position = "fixed";
    temporaryInput.style.left = "-9999px";
    document.body.appendChild(temporaryInput);
    temporaryInput.focus();
    temporaryInput.select();
    try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
    temporaryInput.remove();
  }

  if (copied) {
    copyFeedback.textContent = "✓ Numero copiato! Incollalo nella rubrica e salvalo.";
    copyNumberButton.textContent = "COPIATO ✓";
    window.setTimeout(() => { copyNumberButton.textContent = "COPIA NUMERO"; }, 2500);
  } else {
    copyFeedback.textContent = "Seleziona e copia il numero qui sopra per salvarlo nella rubrica.";
  }
});

confirmContactButton.addEventListener("click", async () => {
  if (isSubmitting) return;
  if (!normalizedPhone || !consentTimestamp) { showStep(1); return; }
  isSubmitting = true;
  submitError.classList.remove("visible");
  submitError.textContent = "";
  confirmContactButton.disabled = true;
  const originalText = confirmContactButton.textContent;
  confirmContactButton.textContent = "ISCRIZIONE IN CORSO…";
  try {
    await createSubscriber(normalizedPhone, consentTimestamp);
    showStep(3);
  } catch (error) {
    console.error("Errore durante l'iscrizione:", error);
    if (error.message === "ALREADY_SUBSCRIBED") {
      submitError.textContent = "Questo numero risulta già iscritto al servizio offerte di Spazio Conad Forlimpopoli. ❤️";
    } else {
      submitError.textContent = "Non siamo riusciti a completare l'iscrizione. Controlla la connessione e riprova tra qualche secondo.";
    }
    submitError.classList.add("visible");
    confirmContactButton.disabled = false;
    confirmContactButton.textContent = originalText;
  } finally {
    isSubmitting = false;
  }
});

async function createSubscriber(phoneNumber, consentAt) {
  const endpoint = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE_NAME)}`;
  const payload = {
    phone_number: phoneNumber,
    status: "iscritto",
    consent: true,
    consent_at: consentAt,
    privacy_version: "v1",
    source: "landing",
    revoked_at: null,
    contact_confirmed: true
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const technicalError = await response.text();
    console.error("Risposta Supabase:", response.status, technicalError);
    if (response.status === 409 || technicalError.includes("23505")) {
      throw new Error("ALREADY_SUBSCRIBED");
    }
    throw new Error("SUPABASE_ERROR");
  }
}

function showStep(stepNumber) {
  document.querySelectorAll(".step").forEach(step => step.classList.remove("active"));
  const target = document.getElementById(`step-${stepNumber}`);
  if (!target) return;
  target.classList.add("active");
  updateProgress(stepNumber);
  document.querySelector(".signup-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateProgress(currentStep) {
  document.querySelectorAll(".progress-item").forEach((item, index) => {
    const step = index + 1;
    item.classList.remove("active", "completed");
    if (step < currentStep) item.classList.add("completed");
    else if (step === currentStep) item.classList.add("active");
  });
}
