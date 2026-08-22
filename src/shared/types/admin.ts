export type AppRole = 'admin' | 'customer' | 'staff';
export type CustomerAccessStatus = 'active' | 'invited' | 'revoked' | 'suspended';

type BaseProfile = {
  customerId?: string;
  email: string;
  name: string;
  uid: string;
};

export type AdminProfile = BaseProfile & { role: 'admin' | 'staff' };
export type CustomerProfile = BaseProfile & {
  accessStatus: CustomerAccessStatus;
  customerId: string;
  role: 'customer';
};
export type AppProfile = AdminProfile | CustomerProfile;
