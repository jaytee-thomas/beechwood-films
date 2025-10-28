const baseContent = Object.freeze({
  homeEyebrow: "",
  homeTitle: "",
  homeLead: "",
  homeCtaLabel: "",
  homeCtaLink: "",
  homeQuickLinkOneLabel: "",
  homeQuickLinkOneHref: "",
  homeQuickLinkTwoLabel: "",
  homeQuickLinkTwoHref: "",
  homeQuickLinkThreeLabel: "",
  homeQuickLinkThreeHref: ""
});

export const contentFields = Object.keys(baseContent);

export const createDefaultContent = () => ({ ...baseContent });

export default baseContent;
