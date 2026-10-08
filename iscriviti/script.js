"use strict";


/* =========================================================
   CONFIGURAZIONE SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://onrpgdsykfjwlsuxbuxf.supabase.co";


const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_C9rNHzuuVz8VYFc-M090UA_DpXi_3uL";


const TABLE_NAME =
  "Offerte conad";



/* =========================================================
   ELEMENTI DELLA PAGINA
   ========================================================= */

const signupForm =
  document.getElementById(
    "signup-form"
  );


const phoneInput =
  document.getElementById(
    "phone"
  );


const consentCheckbox =
  document.getElementById(
    "privacy-consent"
  );


const phoneError =
  document.getElementById(
    "phone-error"
  );


const consentError =
  document.getElementById(
    "consent-error"
  );


const confirmContactButton =
  document.getElementById(
    "confirm-contact-button"
  );


const submitError =
  document.getElementById(
    "submit-error"
  );



/* =========================================================
   STATO
   ========================================================= */

let normalizedPhone = null;

let consentTimestamp = null;

let isSubmitting = false;



/* =========================================================
   NORMALIZZAZIONE NUMERO
   ========================================================= */

function normalizeItalianPhone(value) {

  let digits =
    value.replace(/\D/g, "");


  /*
   * Formati accettati:
   *
   * 3331234567
   * +39 3331234567
   * 39 3331234567
   * 0039 3331234567
   *
   * Formato salvato nel database:
   *
   * 393331234567
   */


  if (
    digits.startsWith("0039")
  ) {

    digits =
      digits.substring(4);

  }


  if (
    digits.startsWith("39") &&
    digits.length > 10
  ) {

    digits =
      digits.substring(2);

  }


  /*
   * Numero mobile italiano.
   *
   * Deve iniziare per 3.
   */

  if (
    !/^3\d{8,9}$/.test(digits)
  ) {

    return null;

  }


  return `39${digits}`;

}



/* =========================================================
   FORMATTAZIONE VISIVA DEL NUMERO
   ========================================================= */

phoneInput.addEventListener(
  "input",
  () => {

    let digits =
      phoneInput.value.replace(
        /\D/g,
        ""
      );


    /*
     * Il prefisso +39 è già mostrato
     * graficamente accanto al campo.
     */

    if (
      digits.startsWith("39") &&
      digits.length > 10
    ) {

      digits =
        digits.substring(2);

    }


    digits =
      digits.substring(
        0,
        10
      );


    let formatted =
      digits;


    if (
      digits.length > 6
    ) {

      formatted =
        `${digits.substring(0, 3)} ` +
        `${digits.substring(3, 6)} ` +
        `${digits.substring(6)}`;

    }

    else if (
      digits.length > 3
    ) {

      formatted =
        `${digits.substring(0, 3)} ` +
        `${digits.substring(3)}`;

    }


    phoneInput.value =
      formatted;


    phoneError.textContent =
      "";

  }
);



/* =========================================================
   PRIVACY
   ========================================================= */

consentCheckbox.addEventListener(
  "change",
  () => {

    consentError.textContent =
      "";

  }
);



/* =========================================================
   STEP 1
   ========================================================= */

signupForm.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();


    phoneError.textContent =
      "";

    consentError.textContent =
      "";


    const phone =
      normalizeItalianPhone(
        phoneInput.value
      );


    /*
     * VALIDAZIONE NUMERO
     */

    if (!phone) {

      phoneError.textContent =
        "Inserisci un numero di cellulare italiano valido.";


      phoneInput.focus();


      return;

    }


    /*
     * VALIDAZIONE PRIVACY
     */

    if (
      !consentCheckbox.checked
    ) {

      consentError.textContent =
        "Per continuare è necessario accettare l'informativa.";


      return;

    }


    normalizedPhone =
      phone;


    /*
     * Memorizziamo il momento
     * dell'espressione del consenso.
     */

    consentTimestamp =
      new Date().toISOString();


    showStep(2);

  }
);



/* =========================================================
   STEP 2
   ========================================================= */

confirmContactButton.addEventListener(
  "click",
  async () => {


    /*
     * Protezione contro
     * click multipli.
     */

    if (isSubmitting) {
      return;
    }


    /*
     * Stato non valido.
     */

    if (
      !normalizedPhone ||
      !consentTimestamp
    ) {

      showStep(1);

      return;

    }


    isSubmitting =
      true;


    submitError.classList.remove(
      "visible"
    );


    submitError.textContent =
      "";


    confirmContactButton.disabled =
      true;


    const originalText =
      confirmContactButton.textContent;


    confirmContactButton.textContent =
      "ISCRIZIONE IN CORSO…";


    try {

      await createSubscriber(
        normalizedPhone,
        consentTimestamp
      );


      /*
       * INSERT riuscito.
       */

      showStep(3);

    }


    catch (error) {


      console.error(
        "Errore durante l'iscrizione:",
        error
      );


      /*
       * NUMERO GIÀ PRESENTE
       */

      if (
        error.message ===
        "ALREADY_SUBSCRIBED"
      ) {

        submitError.textContent =
          "Questo numero risulta già iscritto al servizio offerte di Spazio Conad Forlimpopoli. ❤️";

      }


      /*
       * ALTRO ERRORE
       */

      else {

        submitError.textContent =
          "Non siamo riusciti a completare l'iscrizione. Controlla la connessione e riprova tra qualche secondo.";

      }


      submitError.classList.add(
        "visible"
      );


      confirmContactButton.disabled =
        false;


      confirmContactButton.textContent =
        originalText;

    }


    finally {

      isSubmitting =
        false;

    }

  }
);



/* =========================================================
   INSERT SUPABASE
   ========================================================= */

async function createSubscriber(
  phoneNumber,
  consentAt
) {


  const endpoint =
    `${SUPABASE_URL}/rest/v1/${encodeURIComponent(TABLE_NAME)}`;


  const payload = {

    phone_number:
      phoneNumber,

    status:
      "iscritto",

    consent:
      true,

    consent_at:
      consentAt,

    privacy_version:
      "v1",

    source:
      "landing",

    revoked_at:
      null,

    contact_confirmed:
      true

  };


  const response =
    await fetch(
      endpoint,
      {

        method:
          "POST",


        headers: {

          "apikey":
            SUPABASE_PUBLISHABLE_KEY,


          "Authorization":
            `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,


          "Content-Type":
            "application/json",


          /*
           * Non richiediamo a Supabase
           * la riga appena creata.
           *
           * In questo modo non è
           * necessaria una policy
           * SELECT pubblica.
           */

          "Prefer":
            "return=minimal"

        },


        body:
          JSON.stringify(
            payload
          )

      }
    );



  /* =======================================================
     RISPOSTA NON OK
     ======================================================= */

  if (
    !response.ok
  ) {


    const technicalError =
      await response.text();


    console.error(
      "Risposta Supabase:",
      response.status,
      technicalError
    );


    /*
     * PostgreSQL 23505 =
     * violazione vincolo UNIQUE.
     *
     * Significa che phone_number
     * è già presente.
     */

    if (

      response.status === 409 ||

      technicalError.includes(
        "23505"
      )

    ) {

      throw new Error(
        "ALREADY_SUBSCRIBED"
      );

    }


    throw new Error(
      "SUPABASE_ERROR"
    );

  }

}



/* =========================================================
   NAVIGAZIONE STEP
   ========================================================= */

function showStep(
  stepNumber
) {


  const steps =
    document.querySelectorAll(
      ".step"
    );


  steps.forEach(
    (step) => {

      step.classList.remove(
        "active"
      );

    }
  );


  const target =
    document.getElementById(
      `step-${stepNumber}`
    );


  if (!target) {
    return;
  }


  target.classList.add(
    "active"
  );


  updateProgress(
    stepNumber
  );


  /*
   * Riporta l'utente all'inizio
   * della card dopo il cambio step.
   */

  document
    .querySelector(
      ".signup-card"
    )
    .scrollIntoView({

      behavior:
        "smooth",

      block:
        "start"

    });

}



/* =========================================================
   PROGRESS BAR
   ========================================================= */

function updateProgress(
  currentStep
) {


  const items =
    document.querySelectorAll(
      ".progress-item"
    );


  items.forEach(
    (item, index) => {


      const step =
        index + 1;


      item.classList.remove(
        "active",
        "completed"
      );


      if (
        step < currentStep
      ) {

        item.classList.add(
          "completed"
        );

      }


      else if (
        step === currentStep
      ) {

        item.classList.add(
          "active"
        );

      }

    }
  );

}