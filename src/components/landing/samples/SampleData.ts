export type ImageInstance = {
  name: string;
  alt: string;
};
export type Sample = {
  before: ImageInstance;
  after: ImageInstance;
  startValue: number;
};
export const samples: Sample[] = [
  {
    before: {
      name: "leopard_before",
      alt: "Leopard before",
    },
    after: {
      name: "leopard_after",
      alt: "Leopard after",
    },
    startValue: 50,
  },
  {
    before: {
      name: "melt_before",
      alt: "Melt before",
    },
    after: {
      name: "melt_after",
      alt: "Melt after",
    },
    startValue: 50,
  },
  {
    before: {
      name: "gojo_before",
      alt: "Gojo before",
    },
    after: {
      name: "gojo_after",
      alt: "Gojo after",
    },
    startValue: 50,
  },
  {
    before: {
      name: "sakura_before",
      alt: "Sakura before",
    },
    after: {
      name: "sakura_after",
      alt: "Sakura after",
    },
    startValue: 50,
  },
  {
    before: {
      name: "sombra_before",
      alt: "Sombra before",
    },
    after: {
      name: "sombra_after",
      alt: "Sombra after",
    },
    startValue: 70,
  },
  {
    before: {
      name: "suits_before",
      alt: "Suits before",
    },
    after: {
      name: "suits_after",
      alt: "Suits after",
    },
    startValue: 90,
  },
];
