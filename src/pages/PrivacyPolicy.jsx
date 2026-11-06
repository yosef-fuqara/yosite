import { useEffect } from "react";
import { SITE_URL } from "../seo/siteConfig.js";
import "../styles/privacy-policy.css";

const PAGE_TITLE = "Privacy Policy | YoSite";
const PAGE_DESCRIPTION =
  "How YoSite, operated by Yosef Fuqara in Israel, handles details you submit through WhatsApp, along with browser preferences and fonts.";

export default function PrivacyPolicy() {
  useEffect(() => {
    const root = document.documentElement;
    document.getElementById("yo-intro-boot")?.remove();
    root.classList.remove("yo-intro-pending", "yo-intro-locked", "yo-intro-active");

    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content") ?? "";
    const canonical = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonical?.getAttribute("href") ?? "";
    const privacyUrl = new URL("privacy-policy", SITE_URL).href;

    document.title = PAGE_TITLE;
    description?.setAttribute("content", PAGE_DESCRIPTION);
    canonical?.setAttribute("href", privacyUrl);

    return () => {
      document.title = previousTitle;
      if (description) description.setAttribute("content", previousDescription);
      if (canonical) canonical.setAttribute("href", previousCanonical);
    };
  }, []);

  return (
    <article className="privacy-page" lang="en" dir="ltr">
      <header className="privacy-page__bar">
        <a className="privacy-page__brand" href="/">
          YoSite
          <span className="privacy-page__brand-mark" aria-hidden="true" />
        </a>
        <a className="privacy-page__back" href="/">
          Back to site
        </a>
      </header>

      <main className="privacy-page__main">
        <p className="privacy-page__eyebrow">YoSite</p>
        <h1>Privacy Policy</h1>
        <p className="privacy-page__date">Last updated 5 November 2026.</p>

        <h2>1. Who operates this website</h2>
        <p>
          YoSite is operated by Yosef Fuqara, an individual based in Israel. YoSite is a web design and development studio.
        </p>
        <p>
          Privacy requests are handled by Yosef Fuqara on WhatsApp at{" "}
          <a href="https://wa.me/972505114896" target="_blank" rel="noopener noreferrer">
            +972 50-511-4896
          </a>
          .
        </p>

        <h2>2. Information you choose to provide</h2>
        <p>
          The contact form asks for your name and a description of your project. Giving these details is voluntary. You are not legally required to complete the form. You can also open a WhatsApp chat from the footer and write your own message.
        </p>
        <p>
          If you send a message, Yosef Fuqara receives the details you included so he can read the inquiry and reply. The website does not ask you to create an account, and it does not ask for payment details.
        </p>

        <h2 id="whatsapp-contact">3. How the WhatsApp contact form works</h2>
        <p>
          The form runs in your browser. It builds a WhatsApp link with a pre-filled message that contains the name and project description you entered. When you press the button, WhatsApp opens with that message ready. YoSite receives it only if you then press Send inside WhatsApp.
        </p>
        <p>
          The form does not send those details to a YoSite server. The pre-filled text is part of the WhatsApp web address. Your browser requests that address from WhatsApp, so WhatsApp can receive the pre-filled details when the link opens, before you decide to send the message. The address can also remain in your browser history and on your device.
        </p>
        <p>
          The footer WhatsApp icon opens a chat without a project message already filled in. Opening that link still contacts WhatsApp.
        </p>

        <h2>4. Why this information is used</h2>
        <p>Details you send in a WhatsApp message are used only to:</p>
        <ul>
          <li>read and reply to your inquiry;</li>
          <li>contact you about that inquiry;</li>
          <li>discuss, prepare, or carry out a project with you.</li>
        </ul>
        <p>
          Inquiry information is not used for newsletters, unsolicited advertising, or other marketing. It is not published as a client case study. The portfolio on this website shows demonstration and concept projects.
        </p>

        <h2>5. WhatsApp, Meta, and other services</h2>
        <p>
          WhatsApp is operated by Meta. When the contact link opens, and again if you send the message, WhatsApp and Meta can process the information needed to deliver the chat, including the message content and technical data such as your IP address. Their own notice describes that processing:{" "}
          <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
            WhatsApp Privacy Policy
          </a>
          . YoSite does not control WhatsApp. Deleting a conversation on the operator’s device does not delete records held by WhatsApp or Meta. A request about those records has to be made to them.
        </p>
        <p>
          The pages load typefaces from Google Fonts. Your browser requests those files from Google, and Google may process technical data such as your IP address. Google describes its practices in the{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Google Privacy Policy
          </a>
          .
        </p>
        <p>
          Serving the website can cause the hosting provider to process connection data, including your IP address, browser type, the address of the page you requested, and the time of the request. The provider for the public site is not named here, because that choice has not been confirmed. This page will name the provider, and link to its privacy notice, once it is confirmed.
        </p>
        <p>
          Sent inquiries are kept in the operator’s WhatsApp conversations. They are not copied into an external CRM, cloud notes, email, or another inquiry store. Only Yosef Fuqara has access to those conversations on the operator’s side.
        </p>

        <h2>6. Cookies, local storage, and technical information</h2>
        <p>
          The website code does not set its own cookies. It does not load Google Analytics, a Meta Pixel, Vercel Web Analytics, or Vercel Speed Insights. A visit can still create a technical record at Google when a font file is requested, and at the hosting provider when a page is served.
        </p>
        <p>
          On the main page, the site can read two preferences stored in your browser under localStorage. They stay on your device and are not sent to a YoSite server:
        </p>
        <ul>
          <li>
            <code>yosite-lang</code>, a language code. The site reads it when the main page loads. The current pages do not show a language control, so a visit does not save a new value.
          </li>
          <li>
            <code>yosite-menu-sound</code>, an on or off value for menu sounds. The site reads it if a value is already stored. The current pages do not show a control that changes it.
          </li>
        </ul>
        <p>You can remove these entries by clearing this site’s data in your browser.</p>

        <h2>7. How long information is kept</h2>
        <p>
          The website does not keep a contact-form database. What you type in the form is not submitted to a YoSite server.
        </p>
        <p>
          After you send the WhatsApp message, the inquiry is retained in the operator’s WhatsApp conversation. Only Yosef Fuqara has access to that conversation on the operator’s side.
        </p>
        <p>
          Inquiries that do not become active projects are intended to be deleted from the operator’s WhatsApp within six months. Deletion is done by the operator. The website has no automatic deletion system.
        </p>
        <p>
          This notice does not set a retention period for conversations about active projects.
        </p>
        <p>
          WhatsApp and Meta may keep their own records of a chat. Deleting the operator’s conversation does not mean that WhatsApp or Meta delete theirs.
        </p>

        <h2>8. Security</h2>
        <p>
          The contact form has no YoSite account database to protect. The pre-filled WhatsApp link is still not a private channel on its own, because the details sit in the web address until you send the message. After you send it, protection of the chat is provided by WhatsApp. Those protections do not mean the information is invisible to every third party.
        </p>
        <p>
          No website can honestly promise that information will never be lost, intercepted, or viewed by someone it was not meant for. YoSite does not make that promise.
        </p>

        <h2>9. Access, correction, and deletion</h2>
        <p>
          You may ask Yosef Fuqara for access to inquiry information he still has, for a correction, or for deletion of the copy he controls, subject to applicable law. A request covers information the operator can actually reach, such as a WhatsApp conversation on the operator’s device. It does not require WhatsApp or Meta to delete their own records.
        </p>
        <p>
          Where the Protection of Privacy Law, 5741-1981, as amended, applies to personal information held in a database, that Law provides the following rights, subject to the exceptions in the Law:
        </p>
        <ul>
          <li>
            Section 13 gives a person the right to inspect personal information about themselves kept in the database, in person, through a representative authorized in writing, or through a guardian. The controller is to allow that inspection in Hebrew, Arabic, or English.
          </li>
          <li>
            Section 14 gives a person who has inspected that information, and found it not correct, complete, clear, or up to date, the right to ask the controller to amend it or delete it.
          </li>
        </ul>
        <p>
          The Law and the regulations made under it also set procedures for exercising those rights where they apply, including how a request is made and answered. Sending a request to YoSite does not replace a request to WhatsApp or Meta about information they hold.
        </p>

        <h2>10. Privacy requests</h2>
        <p>
          Send a privacy request on WhatsApp at{" "}
          <a href="https://wa.me/972505114896" target="_blank" rel="noopener noreferrer">
            +972 50-511-4896
          </a>
          . Say that the message is a privacy request, and include enough detail for YoSite to find the conversation. Opening WhatsApp shares that request with WhatsApp, as described above.
        </p>

        <h2>11. Updates to this notice</h2>
        <p>
          If the way information is handled changes, including the hosting provider or how inquiries are stored, this page will be updated and the date above will change with it. This version is dated 5 November 2026.
        </p>

        <p className="privacy-page__end">
          <a className="privacy-page__back" href="/">
            Back to site
          </a>
        </p>
      </main>
    </article>
  );
}
