import { texts } from "src/utils/texts.js";

export default function Privacy() {
  return (
    <>
      {texts.register.terms.privacyContent.sections.map((section, index) => (
        <section key={index} className="mb-6">
          <h3 className="text-xl font-medium text-gray-800 mb-3">
            {section.title}
          </h3>
          <p className="text-gray-600 leading-relaxed text-base">
            {section.content}
          </p>
        </section>
      ))}
    </>
  );
}
