import React from "react";

const PrivacyPolicyPage: React.FC = () => {
  const collectedItems = [
    "name",
    "contact information including email address",
    "demographic information such as postcode, preferences and interests",
    "other information relevant to customer surveys and/or offers.",
    "live location data (to know your location when you shop online), if the user chooses to share it"
  ];

  const usageItems = [
    "Internal record keeping.",
    "We may use the information to improve our products and services.",
    "We may periodically send promotional emails about new products, special offers or other information which we think you may find interesting using the email address which you have provided.",
    "From time to time, we may also use your information to contact you for market research purposes. We may contact you by email, phone or whatsapp. We may use the information to customise the website according to your interests.",
    "Without identifying you personally we may use your information to provide updates on our service offerings and promotional schemes through third party advertising partners. Our third party advertising partners may use cookies on our website as well as third party websites and social media platforms to understand customer interests to provide updates on our latest service offerings and promotional schemes that are akin to your interests. Our third party advertising partners provide you with complete control over ads experience and you can remove ads shown to you.",
  ];

  const cookieItems = [
    "A cookie is a small file which asks permission to be placed on your computer's hard drive. Once you agree, the file is added and the cookie helps analyse web traffic or lets you know when you visit a particular site.",
    "Cookies allow web applications to respond to you as an individual. The web application can tailor its operations to your needs, likes and dislikes by gathering and remembering information about your preferences.",
    "We use traffic log cookies to identify which pages are being used. This helps us analyse data about web page traffic and improve our website in order to tailor it to customer needs. We only use this information for statistical analysis purposes and then the data is removed from the system.",
    "Overall, cookies help us provide you with a better website, by enabling us to monitor which pages you find useful and which you do not. A cookie in no way gives us access to your computer or any information about you, other than the data you choose to share with us.",
    "You can choose to accept or decline cookies. Most web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. This may prevent you from taking full advantage of the website.",
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-14 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-4xl bg-white p-10 shadow-lg border border-slate-200">
        <p className="mb-6 text-sm uppercase tracking-[0.24em] text-cyan-600 font-bold">Privacy Policy</p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-6">
          How SIMAK FRESH handles your information
        </h1>
        <p className="max-w-3xl text-base leading-8 text-slate-600">
          This privacy policy sets out how simakfresh.ae uses and protects any information that you give simakfresh.ae when you use this website. simakfresh.ae is committed to ensuring that your privacy is protected. Should we ask you to provide certain information by which you can be identified when using this website, then you can be assured that it will only be used in accordance with this privacy statement.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
          simakfresh.ae may change this policy from time to time by updating this page. You should check this page from time to time to ensure that you are happy with any changes.
        </p>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">What we collect</h2>
        <p className="mt-4 text-slate-600 leading-7">We may collect the following information:</p>
        <ul className="mt-4 space-y-3 text-slate-600">
          {collectedItems.map((item) => (
            <li key={item} className="flex gap-3 leading-7">
              <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-slate-600 leading-7">
          For the exhaustive list of cookies we collect see the List of cookies we collect section.
        </p>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">What we do with the information we gather</h2>
        <p className="mt-4 text-slate-600 leading-7">
          We require this information to understand your needs and provide you with a better service, and in particular for the following reasons:
        </p>
        <ul className="mt-4 space-y-3 text-slate-600">
          {usageItems.map((item) => (
            <li key={item} className="flex gap-3 leading-7">
              <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">Security</h2>
        <p className="mt-4 text-slate-600 leading-7">
          We are committed to ensuring that your information is secure. In order to prevent unauthorised access or disclosure, we have put in place suitable physical, electronic and managerial procedures to safeguard and secure the information we collect online.
        </p>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">How we use cookies</h2>
        <>
          {cookieItems.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">Links to other websites</h2>
        <p className="mt-4 text-slate-600 leading-7">
          Our website may contain links to other websites of interest. However, once you have used these links to leave our site, you should note that we do not have any control over that other website. Therefore, we cannot be responsible for the protection and privacy of any information which you provide whilst visiting such sites and such sites are not governed by this privacy statement. You should exercise caution and look at the privacy statement applicable to the website in question.
        </p>

        <h2 className="mt-10 text-2xl font-bold text-slate-900">Controlling your personal information</h2>
        <p className="mt-4 text-slate-600 leading-7">
          You may choose to restrict the collection or use of your personal information in the following ways:
        </p>
        <ul className="mt-4 space-y-3 text-slate-600">
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span>whenever you are asked to fill in a form on the website, look for the box that you can click to indicate that you do not want the information to be used by anybody for direct marketing purposes</span>
          </li>
          <li className="flex gap-3 leading-7">
            <span className="mt-2 h-2 w-2 rounded-full bg-cyan-600 shrink-0" />
            <span>if you have previously agreed to us using your personal information for direct marketing purposes, you may change your mind at any time by writing to or emailing us at support@simakfresh.ae. We will not sell, disturb or lease your personal information to third parties unless we have your permission or are required by law to do so. We may use your personal information to send you promotional information about third parties which we think you may find interesting if you tell us that you wish this to happen.</span>
          </li>
        </ul>
        <p className="mt-4 text-slate-600 leading-7">
          You may request details of personal information which we hold about you under the Federal Law No. 1 of 2006 On Electronic Commerce and Transactions (eCommerce Law). A small fee will be payable. If you would like a copy of the information held on you please write to SIMAK FRESH LLC, Sharjah Media City, Sharjah.
        </p>
        <p className="mt-4 text-slate-600 leading-7">
          If you believe that any information we are holding on you is incorrect or incomplete, please write to or email us as soon as possible, at the above address. We will promptly correct any information found to be incorrect.
        </p>
      </div>
    </main>
  );
};

export default PrivacyPolicyPage;
