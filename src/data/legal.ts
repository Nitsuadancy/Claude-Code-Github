import { MOVEMENT_FEE_TERMS } from '@/lib/pricing';

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
        'Manna is a marketplace, starting in Orlando, Florida, where neighbors order food from home kitchens for pickup. This policy explains what information Manna collects, why, and the choices you have.',
      ],
    },
    {
      heading: 'What we collect',
      body: [
        '- Account details: your mobile number, name and email.',
        '- Preferences: your neighborhood, and the diets and allergens you choose to tell us about.',
        '- Orders: what you order, from which kitchen, pickup times, notes to the chef, tips, your reviews and any reviews you report.',
        '- Help requests: what you tell our support team when you ask for help with an order. The kitchen does not see them.',
        '- Order messages: what you and the kitchen write to each other in an order’s chat, and when you read them. Your phone number is never shared.',
        '- For kitchens: your kitchen details, menu, photos and intro video, pickup address and pickup spot photo, opening hours, photo updates you send on orders, and the documents you upload for verification, such as a food handler certificate and ID.',
        '- Payments: handled by our payment provider. Manna does not store full card numbers.',
        '- Device information: app version, device type and crash reports, so we can fix problems.',
        '- If you add a pickup to your calendar, the event is saved in your phone’s calendar, not sent to Manna. On iPhone, Manna asks only to add events and cannot read your calendar.',
      ],
    },
    {
      heading: 'How we use it',
      body: [
        '- To run Manna: show kitchens, take orders, and keep customers and kitchens updated about each order.',
        '- To verify kitchens: we review documents before a kitchen is marked Verified.',
        '- To keep Manna safe: prevent fraud, enforce our terms, and respond to reports. Our team reads order messages only when someone reports them.',
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
        'Manna connects customers with independent home cooks and kitchens. Each kitchen is its own business and the seller of its food: it makes, packages, labels and sells it. Manna is not the seller. Manna provides the app, takes payment on the kitchen’s behalf, and helps coordinate pickup.',
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
        `- Manna adds a movement fee at checkout: ${MOVEMENT_FEE_TERMS}. Kitchens keep 100% of their prices, and tips go entirely to the kitchen.`,
        '- Orders are for pickup at the time you choose. The kitchen shares its pickup address once it accepts your order.',
        '- If a kitchen declines your order or cancels a bake day, you are not charged, or you get a full refund.',
        '- You can cancel an order until the kitchen accepts it.',
        '- Pick up in your pickup window, or within 2 hours of your order being ready. Food that is not picked up within 30 minutes after that is still paid to the kitchen, because it was made for you.',
        `- If something is wrong with your order, tell us within 24 hours at ${LEGAL_CONTACT} and we will work it out with the kitchen.`,
      ],
    },
    {
      heading: 'Food safety and allergies',
      body: [
        'Manna does not inspect kitchens or test food. Kitchens marked “Home kitchen · not inspected” have no food permit or license on file with Manna and may not be licensed or inspected by any authority. Kitchens marked “Licensed kitchen” have a permit or license that our team reviewed. A Verified badge means our team checked the cook’s ID and food handler certificate.',
        'You decide which kitchens to order from. Each kitchen lists its ingredients and allergens: always check them, and tell the cook about allergies in your order note.',
      ],
    },
    {
      heading: 'For kitchens',
      body: [
        '- You are solely responsible for following the food laws of your state, county and city for everything you sell, including what you may sell from home, permits and licenses, labels, sales limits, taxes and home-business rules. You confirm this before opening your kitchen. Manna does not check that you comply.',
        '- Only upload permits and licenses that are real, current and yours. Tell us if one expires or is revoked.',
        '- We strongly recommend product liability insurance.',
        '- You agree to cover Manna’s costs, including reasonable legal fees, for claims arising from your food, your kitchen or your breach of these terms.',
        '- List accurate ingredients, allergens, prices and photos of your own food.',
        '- Post only photos and videos you took or have the right to share, and don’t show other people without their permission. Your pickup spot photo is shared only with customers whose orders you accept.',
        '- Honor the orders you accept, and keep customers’ information private.',
        '- Payouts and any fees are described in the app before you publish your kitchen.',
      ],
    },
    {
      heading: 'Reviews and content',
      body: [
        'Reviews must be honest and about a real order. You keep ownership of what you post, and you allow Manna to show it in the app and to promote Manna.',
        'Manna has no tolerance for abusive or objectionable content. Anyone can report a review or a message from the app. We check every report within 24 hours, remove content that breaks these terms, and may close the account that posted it.',
      ],
    },
    {
      heading: 'Order messages',
      body: [
        'Once a kitchen accepts your order, you and the kitchen can message each other about it until 24 hours after pickup. Keep messages about the order: changes, timing and pickup.',
        'Pay for orders in Manna. Payments made outside the app, such as by Venmo, Cash App or Zelle, aren’t covered by Manna if something goes wrong.',
        'Either of you can block the other at any time, which stops the chat both ways, and report any message to our team.',
      ],
    },
    {
      heading: 'Things you can’t do',
      body: [
        '- Break the law, or sell food you aren’t allowed to sell where you live.',
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
        'Manna is provided as is. Kitchens, not Manna, are responsible for the food they make and sell, including its safety and its compliance with the law. To the extent the law allows, Manna is not liable for indirect losses, and our total liability for any claim is limited to the fees you paid Manna in the 12 months before it.',
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
