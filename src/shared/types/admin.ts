export type AppRole = 'admin' | 'customer' | 'staff';
export type AccountAccessStatus = 'active' | 'invited' | 'revoked' | 'suspended';

type BaseProfile = {
  customerId?: string;
  email: string;
  emailVerified: boolean;
  name: string;
  uid: string;
};

export type AdminProfile = BaseProfile & { accessStatus: AccountAccessStatus; role: 'admin' | 'staff' };
export type CustomerProfile = BaseProfile & {
  accessStatus: AccountAccessStatus;
  customerId: string;
  role: 'customer';
};
export type AppProfile = AdminProfile | CustomerProfile;
