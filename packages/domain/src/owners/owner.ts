export type Owner = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamOwner = {
  teamId: string;
  ownerId: string;
  isPrimary: boolean;
};
