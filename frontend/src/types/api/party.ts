type Party = {
  id: string;
  datetime: string;
  addressId: number;
  contactOneStudentId: number;
  contactTwoStudentId: number;
};

type PartyData = {
  datetime: string;
  addressId: number;
  contactOneStudentId: number;
  contactTwoStudentId: number;
};

export type { Party, PartyData };
