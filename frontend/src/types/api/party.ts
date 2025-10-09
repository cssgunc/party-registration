type Party = {
  id: number;
  datetime: Date;
  addressId: number;
  contactOneId: number;
  contactTwoId: number;
};

type PartyData = {
  datetime: Date;
  addressId: number;
  contactOneId: number;
  contactTwoId: number;
};

export type { Party, PartyData };
