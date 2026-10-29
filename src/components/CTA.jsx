import { useRef, useState } from "react";
import { ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import "../styles/contact.css";

const CONTACT_API_URL = import.meta.env.VITE_CONTACT_API_URL || "/api/contact";
const EMPTY = { name: "", email: "", phone: "", message: "" };

function CoffeeDrawing() {
  return (
    <svg className="coffee-contact__drawing" viewBox="0 0 220 180" fill="none" aria-hidden="true">
      <ellipse cx="100" cy="144" rx="81" ry="17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M42 77h116l-8 44c-4 24-92 24-100 0L42 77Z" fill="var(--coffee-paper)" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="100" cy="77" rx="58" ry="13" fill="var(--coffee-paper)" stroke="currentColor" strokeWidth="2" />
      <path d="M58 79c20-10 63-10 84 0" stroke="currentColor" strokeWidth="1.5" />
      <path d="M159 83c35-8 40 28 12 35l-20 4" stroke="currentColor" strokeWidth="2" />
      <g className="coffee-contact__steam" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M79 52c-17-17 17-20 1-38" /><path d="M101 49c-17-17 17-20 1-38" /><path d="M123 53c-17-17 17-20 1-38" />
      </g>
    </svg>
  );
}

export default function CTA() {
  const { t, dir } = useI18n();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const formRef = useRef(null);
  const sendingRef = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sendingRef.current) return;
    const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    const nextErrors = {};
    Object.entries(fields).forEach(([key, value]) => {
      if (!value) nextErrors[key] = "required";
    });
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) nextErrors.email = "emailInvalid";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstInvalid = Object.keys(EMPTY).find((field) => nextErrors[field]);
      formRef.current?.elements.namedItem(firstInvalid)?.focus();
      return;
    }
    sendingRef.current = true;
    setStatus("sending");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(CONTACT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
        signal: controller.signal,
      });
      const data = await response.json();
      setStatus(response.ok && data.ok === true ? "success" : "error");
    } catch {
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
      sendingRef.current = false;
    }
  };

  return (
    <section id="cta" className="coffee-contact" dir={dir} aria-labelledby="coffee-contact-title">
      <div className="coffee-contact__eyebrow">
        <span><span className="coffee-contact__dot" />{t("coffee.eyebrow")}</span>
        <span className="coffee-contact__edition">YoSite — {t("coffee.smallNote")}</span>
      </div>
      <div className="coffee-contact__layout">
        <div className="coffee-contact__invitation">
          <h2 id="coffee-contact-title">{t("coffee.title")}<span>{t("coffee.titleAccent")}</span></h2>
          <p className="coffee-contact__intro">{t("coffee.intro")}</p>
          <a className="coffee-contact__whatsapp" href={`https://wa.me/972505114896?text=${encodeURIComponent(t("coffee.whatsappMessage"))}`} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.5L3 20.5l1.4-4.7a8.5 8.5 0 1 1 16.1-4.2Z" /><path d="m8.6 7.4 1.5 2.8-1 1c.8 1.5 1.8 2.5 3.4 3.2l1-1 2.7 1.4c-.4 1.6-1.4 2.2-2.7 1.8-3.6-1-6.2-3.7-7-6.8-.3-1.2.4-2 2.1-2.4Z" /></svg>
            {t("coffee.whatsapp")}<ArrowUpRight size={19} />
          </a>
          <div className="coffee-contact__coffee-note"><CoffeeDrawing /><p>{t("coffee.noteLine1")}<br /><span>{t("coffee.noteLine2")}</span></p></div>
        </div>
        <div className="coffee-contact__form-side">
          <div className="coffee-contact__form-heading"><span className="coffee-contact__index">01 /</span><h3>{t("coffee.formTitle")}</h3></div>
          {status === "success" ? (
            <div className="coffee-contact__success" role="status" tabIndex={-1} ref={(element) => element?.focus()}>
              <span className="coffee-contact__success-icon"><Check size={28} /></span>
              <h4>{t("coffee.successTitle")}</h4>
              <p>{t("coffee.successBody", { name: values.name.trim() })}</p>
              <button type="button" onClick={() => { setValues(EMPTY); setErrors({}); setStatus("idle"); }}>{t("coffee.sendAnother")}<ArrowUpRight size={18} /></button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={status === "sending"} className="coffee-contact__form">
              {["name", "email", "phone", "message"].map((field, index) => {
                const shared = {
                  id: `coffee-${field}`, name: field, value: values[field], required: true,
                  placeholder: t(`coffee.placeholders.${field}`), disabled: status === "sending",
                  "aria-invalid": Boolean(errors[field]),
                  "aria-describedby": errors[field] ? `coffee-${field}-error` : undefined,
                  onChange: (event) => {
                    setValues((current) => ({ ...current, [field]: event.target.value }));
                    setErrors((current) => ({ ...current, [field]: undefined }));
                    if (status === "error") setStatus("idle");
                  },
                };
                return (
                  <div className={`coffee-contact__field coffee-contact__field--${field}`} key={field}>
                    <label htmlFor={shared.id}><span aria-hidden="true">0{index + 1}</span>{t(`coffee.labels.${field}`)}</label>
                    {field === "message" ? <textarea {...shared} rows={2} maxLength={5000} /> : <input {...shared} type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} autoComplete={field === "phone" ? "tel" : field} maxLength={field === "phone" ? 40 : 254} />}
                    {errors[field] && <p id={`coffee-${field}-error`} className="coffee-contact__error">{t(`coffee.${errors[field]}`)}</p>}
                  </div>
                );
              })}
              <div className="coffee-contact__submit-row">
                <p>{t("coffee.formNote")}</p>
                <button className="coffee-contact__submit" type="submit" disabled={status === "sending"}>
                  {t(status === "sending" ? "coffee.sending" : "coffee.send")}
                  <span>{status === "sending" ? <LoaderCircle className="coffee-contact__spinner" size={21} /> : <ArrowUpRight size={24} />}</span>
                </button>
              </div>
              {status === "error" && <p className="coffee-contact__error coffee-contact__submit-error" role="alert">{t("coffee.submitError")}</p>}
            </form>
          )}
        </div>
      </div>
      <div className="coffee-contact__bottom"><span>{t("coffee.bottomLeft")}</span><span>{t("coffee.bottomRight")}</span></div>
    </section>
  );
}
