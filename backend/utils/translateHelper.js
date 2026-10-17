const { translate } = require("@vitalets/google-translate-api");

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const translateText = async (text, targetLang) => {
  if (!text || !text.trim()) return "";

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await translate(text, { to: targetLang });
      if (res.text && res.text.trim()) {
        return res.text;
      }
      lastError = new Error("Translation provider returned an empty response");
    } catch (err) {
      lastError = err;
    }

    if (attempt < 3) {
      await sleep(attempt * 500);
    }
  }

  throw new Error(
    `Translation failed for ${targetLang}: ${lastError?.message || "empty response"}`,
  );
};

const autoTranslateKathaAndQuestions = async ({
  title,
  content,
  questions,
}) => {
  const translations = {
    hi: {
      title,
      content,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        explanation: q.explanation || "",
      })),
    },
  };

  const targets = [
    { code: "en", name: "English" },
    { code: "mr", name: "Marathi" },
    { code: "sa", name: "Sanskrit" },
  ];

  for (const lang of targets) {
    try {
      const transTitle = await translateText(title, lang.code);
      const transContent = await translateText(content, lang.code);

      const transQuestions = [];
      for (const q of questions) {
        const qText = await translateText(q.question, lang.code);
        const opts = [];
        for (const opt of q.options) {
          opts.push(await translateText(opt, lang.code));
        }
        const exp = q.explanation
          ? await translateText(q.explanation, lang.code)
          : "";
        transQuestions.push({
          question: qText,
          options: opts,
          explanation: exp,
        });
      }

      translations[lang.code] = {
        title: transTitle,
        content: transContent,
        questions: transQuestions,
      };
    } catch (langErr) {
      console.error(`Skipping translation for ${lang.name}:`, langErr.message);
    }
  }

  return translations;
};

module.exports = { autoTranslateKathaAndQuestions };
