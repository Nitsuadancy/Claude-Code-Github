/**
 * Manna's privacy policy and terms of service, shown in the app.
 *
 * DRAFTS for attorney review: not in effect. Before launch, a lawyer should
 * review both, and the contact email and company details must be filled in.
 */

/** Replace before launch with a real, monitored address. */
export const LEGAL_CONTACT = '[contact email to be added before launch]';

export interface LegalSection {
  heading: string;
  /** Paragraphs; a line starting with "- " is a bullet. */
  body: string[];
}

export interface LegalDocument {
  title: string;
  status: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  status: 'Draft for review. Not yet in effect.',
  sections: [
    {
      heading: 'Who we are',
      body: [
        'Manna is a marketplace in Orlando, Florida, where neighbors order food from home kitchens for pickup. This policy explains what information Manna collects, why, and the choices you have.',
      ],
    },
    {
      heading: 'What we collect',
      body: [
        '- Account details: your mobile number, name and email.',
        '- Preferences: your neighborhood, and the diets and allergens you choose to tell us about.',
        '- Orders: what you order, from which kitchen, pickup times, notes to the chef, tips, and your reviews.',
        '- For kitchens: your kitchen details, menu, photos, pickup address, opening hours, and the documents you upload for verification, such as a food handler certificate and ID.',
        '- Payments: handled by our payment provider. Manna does not store full card numbers.',
        '- Device information: app version, device type and crash reports, so we can fix problems.',
      ],
    },
    {
      heading: 'How we use it',
      body: [
        '- To run Manna: show kitchens, take orders, and keep customers and kitchens updated about each order.',
        '- To verify kitchens: we review documents before a kitchen is marked Verified.',
        '- To keep Manna safe: prevent fraud, enforce our terms, and respond to reports.',
        '- To support you and improve the app.',
        '- To send messages you need, like sign-in codes and order updates.',
      ],
    },
    {
      heading: 'Who sees what',
      body: [
        '- The kitchen you order from sees your name, your order, your notes and your pickup time.',
        '- Customers see a kitchen’s name, story, menu, neighborhood and reviews. A kitchen’s street address is shared only with a customer whose order the kitchen has accepted.',
        '- Reviews show your first name and last initial.',
        '- Service providers that run Manna for us, such as hosting, payments, text messages and notifications, process information only to provide their service.',
        '- We may share information if the law requires it, to protect people’s safety, or as part of a sale or merger of the business.',
        'Manna does not sell your personal information.',
      ],
    },
    {
      heading: 'Keeping and deleting your information',
      body: [
        'You can delete your account at any time from your profile. We then remove your details, favorites and, for kitchens, your listing, address and documents. Order and review records are kept without your name or contact details, because kitchens need them for their records.',
        'We keep other information only as long as we need it to run Manna or to meet legal obligations.',
      ],
    },
    {
      heading: 'Your choices',
      body: [
        '- Edit your name, email, neighborhood, diet and allergies in your profile.',
        '- Turn notifications on or off in your phone’s settings.',
        '- Ask us for a copy of your information or to correct it.',
      ],
    },
    {
      heading: 'Children',
      body: ['Manna is not meant for children under 13, and we do not knowingly collect information from them.'],
    },
    {
      heading: 'Security',
      body: [
        'We protect your information with access controls and encryption in transit, and limit who on our team can see it. No system is perfectly secure, so please keep your phone and account safe.',
      ],
    },
    {
      heading: 'Changes and contact',
      body: [
        'If we change this policy, we will update it here and tell you in the app before important changes take effect.',
        `Questions or requests: ${LEGAL_CONTACT}.`,
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  status: 'Draft for review. Not yet in effect.',
  sections: [
    {
      heading: 'What Manna is',
      body: [
        'Manna connects customers with independent home kitchens. Each kitchen is its own business: it makes, packages, labels and sells its food. Manna provides the app, takes payment on the kitchen’s behalf, and helps coordinate pickup.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        'You need a mobile number to sign in. Keep your account secure and your details accurate. You must be at least 18 to sell on Manna, and at least 13 to use it otherwise.',
      ],
    },
    {
      heading: 'Ordering',
      body: [
        '- Kitchens set their own prices, menus, hours and daily limits.',
        '- Manna adds a 5% movement fee at checkout. Tips go entirely to the kitchen.',
        '- Orders are for pickup at the time you choose. The kitchen shares its pickup address once it accepts your order.',
        '- If a kitchen declines your order, you are not charged.',
        `- If something is wrong with your order, tell us within 24 hours at ${LEGAL_CONTACT} and we will work it out with the kitchen.`,
      ],
    },
    {
      heading: 'Food safety and allergies',
      body: [
        'Home kitchens on Manna sell cottage foods under Florida law. Their products are made in a cottage food operation that is not subject to Florida’s food safety regulations.',
        'Each kitchen lists its ingredients and allergens. Always check them, and tell the chef about allergies in your order note. Manna does not inspect kitchens; a Verified badge means our team reviewed the kitchen’s documents.',
      ],
    },
    {
      heading: 'For kitchens',
      body: [
        '- You are responsible for following Florida’s cottage food law, including what you may sell, labeling, the annual sales limit, taxes, and any home-business rules.',
        '- List accurate ingredients, allergens, prices and photos of your own food.',
        '- Honor the orders you accept, and keep customers’ information private.',
        '- Payouts and any fees are described in the app before you publish your kitchen.',
      ],
    },
    {
      heading: 'Reviews and content',
      body: [
        'Reviews must be honest and about a real order. You keep ownership of what you post, and you allow Manna to show it in the app and to promote Manna. We may remove content that breaks these terms.',
      ],
    },
    {
      heading: 'Things you can’t do',
      body: [
        '- Break the law, or sell foods that Florida’s cottage food law doesn’t allow.',
        '- Mislead customers or kitchens, or post fake reviews.',
        '- Harass anyone, or misuse anyone’s personal information.',
        '- Interfere with how Manna works.',
      ],
    },
    {
      heading: 'Ending your use',
      body: [
        'You can delete your account at any time. We may suspend or close accounts that break these terms or put others at risk.',
      ],
    },
    {
      heading: 'Our responsibility',
      body: [
        'Manna is provided as is. Kitchens, not Manna, are responsible for the food they make. To the extent the law allows, Manna is not liable for indirect losses, and our total liability for any claim is limited to the fees you paid Manna in the 12 months before it.',
      ],
    },
    {
      heading: 'Changes, law and contact',
      body: [
        'We may update these terms and will tell you in the app before important changes take effect. These terms are governed by the laws of Florida.',
        `Questions: ${LEGAL_CONTACT}.`,
      ],
    },
  ],
};
