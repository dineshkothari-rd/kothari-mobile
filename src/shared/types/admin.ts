export type AppRole = 'admin' | 'customer' | 'staff';

type BaseProfile = {
  customerId?: string;
  email: string;
  name: string;
  uid: string;
};

export type AdminProfile = BaseProfile & { role: 'admin' | 'staff' };
export type CustomerProfile = BaseProfile & { customerId: string; role: 'customer' };
export type AppProfile = AdminProfile | CustomerProfile;
