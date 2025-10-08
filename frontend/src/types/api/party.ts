type Party = {
  id: string;
  datetime: string;
  addressId: number;
  contactOneId: number;
  contactTwoId: number;
};

type PartyData = {
  datetime: string;
  addressId: number;
  contactOneId: number;
  contactTwoId: number;
};

export type { Party, PartyData };
