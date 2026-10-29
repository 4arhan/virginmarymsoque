// Donation appeals — the single list used by the donate page (assets/js/donate.js)
// and by the Stripe checkout function (api/donate.js).
//
// To add an appeal, add an entry here. `id` goes into the Stripe payment's
// metadata (appeal=<id>), so keep it stable once donations have been made.
// The appeal marked `featured` is shown as the urgent banner and selected by
// default on the donate page.

export const CURRENCY = "aud";

// Smallest and largest single online donation, in dollars. Larger gifts can be
// arranged by bank transfer through the office.
export const MIN_AMOUNT = 5;
export const MAX_AMOUNT = 10000;

export const PRESETS = {
  once: [25, 50, 100, 250, 500, 1000],
  monthly: [10, 20, 30, 50, 100, 250],
};

export const DEFAULT_AMOUNT = { once: 100, monthly: 30 };

export const APPEALS = [
  {
    id: "gaza",
    name: "Gaza Emergency Appeal",
    tag: "Urgent",
    icon: "i-olive",
    summary: "Food, clean water, medical care and shelter for families in Gaza.",
    featured: true,
  },
  {
    id: "emergencies",
    name: "Global Emergencies",
    tag: "Humanitarian",
    icon: "i-globe",
    summary: "Relief for people facing war, famine and natural disaster around the world.",
  },
  {
    id: "masjid",
    name: "Masjid Fund",
    tag: "General",
    icon: "i-mosque",
    summary: "Utilities, cleaning, maintenance and the day-to-day running of the masjid.",
  },
  {
    id: "zakat",
    name: "Zakat",
    tag: "Obligation",
    icon: "i-coins",
    summary: "Distributed according to the eight categories of recipients set out in the Qur’an.",
  },
  {
    id: "sadaqah-jariyah",
    name: "Sadaqah Jariyah",
    tag: "Ongoing charity",
    icon: "i-sprout",
    summary: "Charity whose reward continues, by the permission of Allah, for as long as this masjid serves.",
  },
  {
    id: "local-families",
    name: "Food & Welfare",
    tag: "Local",
    icon: "i-home-heart",
    summary: "Food and practical support for local families in need across Melbourne’s west.",
  },
  {
    id: "youth-education",
    name: "Classes & Youth",
    tag: "Education",
    icon: "i-book",
    summary: "Qur’an and Islamic classes and youth programs for the next generation.",
  },
];

export function findAppeal(id) {
  return APPEALS.find((a) => a.id === id);
}
