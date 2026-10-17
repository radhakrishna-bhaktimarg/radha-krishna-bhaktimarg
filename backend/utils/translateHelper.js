const { translate } = require("@vitalets/google-translate-api");

const splitForMyMemory = (text, maxLength = 450) => {
  const chunks = [];
  let remaining = text.trim();

  while (remaining.length > maxLength) {
    const splitAt = remaining.lastIndexOf(" ", maxLength);
    const boundary = splitAt > 0 ? splitAt : maxLength;
    chunks.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
};

const translateWithMyMemory = async (text, targetLang) => {
  const chunks = splitForMyMemory(text);
  const translatedChunks = await Promise.all(
    chunks.map(async (chunk) => {
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", chunk);
      url.searchParams.set("langpair", `hi|${targetLang}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`MyMemory responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data?.responseData?.translatedText?.trim();
      if (!translatedText) {
        throw new Error("MyMemory returned an empty response");
      }
      return translatedText;
    }),
  );

  return translatedChunks.join(" ");
};

const translateText = async (text, targetLang) => {
  if (!text || !text.trim()) return "";

  try {
    return await translateWithMyMemory(text, targetLang);
  } catch (myMemoryError) {
    try {
      const res = await translate(text, { to: targetLang });
      if (res.text && res.text.trim()) {
        return res.text;
      }
      throw new Error("Google Translate returned an empty response");
    } catch (googleError) {
      throw new Error(
        `Translation failed for ${targetLang}: ${myMemoryError.message}; fallback: ${googleError.message}`,
      );
    }
  }
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

      const transQuestions = await Promise.all(
        questions.map(async (q) => {
          const [qText, opts, exp] = await Promise.all([
            translateText(q.question, lang.code),
            Promise.all(q.options.map((opt) => translateText(opt, lang.code))),
            q.explanation ? translateText(q.explanation, lang.code) : "",
          ]);

          return {
            question: qText,
            options: opts,
            explanation: exp,
          };
        }),
      );

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
