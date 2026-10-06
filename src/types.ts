export interface Dependent {
  id: string;
  name: string;
  relationship: string;
}

export interface UserProfile {
  id?: string;
  userId: string;
  name: string;
  dob: string;
  address: string;
  occupation: string;
  employer: string;
  income: number;
  state: string;
  dependents: Dependent[];
  updatedAt?: string;
  createdAt?: string;
  email?: string;
  phone?: string;
  emergencyPhone?: string;
}

export interface Transaction {
  id?: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  description: string;
}

export interface Protection {
  id?: string;
  userId: string;
  policyName: string;
  coverageAmount: number;
  premium: number;
  premiumFrequency?: 'Monthly' | 'Yearly';
  type: 'Medical' | 'Life' | 'Critical Illness' | 'Accident' | 'General' | (string & {});
  expiryDate?: string;
  company?: string;
  yearStarted?: string;
  policyExpiryYear?: string;
  maturityPeriod?: string;
  deathBenefit?: number;
  disabilityBenefit?: number;
  disabilityType?: 'Additional' | 'Accelerated';
  accident?: number;
  criticalIllness?: number;
  criticalIllnessType?: 'Additional' | 'Accelerated';
  medicalCardLimitAnnual?: number;
  medicalCardLimitLifetime?: number;
  roomAndBoard?: number;
  dailyAllowance?: number;
  hasHospitalAllowance?: boolean;
  hasWaiver?: boolean;
  medicalDeductibleType?: 'Non-Deductible' | 'Deductible';
  medicalDeductibleAmount?: number;
  nominationNormalPercentage?: number;
  nominationHibahPercentage?: number;
  otherBenefits?: { id: string; label: string; value: string }[];
  hasCashValue?: boolean;
  cashValueAmount?: number;
}

export interface Savings {
  id?: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  type: 'Emergency' | 'Short Term' | 'Education' | 'Other';
}

export interface Investment {
  id?: string;
  userId: string;
  assetName: string;
  currentValue: number;
  type: 'ASB' | 'Tabung Haji' | 'Gold' | 'Stocks' | 'Unit Trust' | 'Property';
}

export interface ZakatRecord {
  id?: string;
  userId: string;
  year: number;
  amount: number;
  datePaid?: string;
  type: 'Pendapatan' | 'Simpanan' | 'Emas' | 'Saham' | 'EPF';
}

export interface NetWorthItem {
  id?: string;
  userId: string;
  name: string;
  type: 'Asset' | 'Liability';
  category: string;
  value: number;
  isLiquid?: boolean;
  hasCoverage?: boolean;
  hasCharge?: boolean;
  accountNo?: string;
  location?: string;
  weight?: number;
  pricePerUnit?: number;
  balanceAkaun1?: number;
  balanceAkaun2?: number;
  balanceAkaun3?: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  subCategory: string;
  label: string;
  monthly: number;
  isCustom?: boolean;
  rentalCollection?: number;
  installment?: number;
}

export interface RetirementSettings {
  id?: string;
  userId: string;
  targetAge: number;
  inflationRate: number;
  postRetirementSpendingRatio: number;
  expectedRoi: number;
  assetRois: { [assetId: string]: number };
  excludedAssetIds: string[];
  isRenting: boolean;
  monthlyRent: number;
  updatedAt: string;
}

export interface ZakatSettings {
  id?: string;
  userId: string;
  excludedAssetIds: string[];
  nisab: number;
  updatedAt: string;
}

export interface InheritanceSettings {
  id?: string;
  userId: string;
  funeralCosts: {
    van: number;
    grave: number;
    others: number;
    customItems: { id: string; label: string; value: number }[];
  };
  debts: {
    zakat: number;
    fidyah: number;
    badalHaji: number;
    customAllahDebts: { id: string; label: string; value: number }[];
  };
  maritalPropertyPercentage: number;
  wasiatWaqaf: {
    wasiat: number;
    waqaf: number;
    others: number;
  };
  hibah: {
    takaful: number;
    property: number;
    others: number;
  };
  heirs: {
    hasFather: boolean;
    hasMother: boolean;
    hasHusband: boolean;
    hasWife: boolean;
    sonCount: number;
    daughterCount: number;
    hasSiblings: boolean;
  };
  hibahAssetIds: string[];
  updatedAt: string;
}

export interface BudgetProfile {
  id?: string;
  userId: string;
  lastUpdated: string;
  items: BudgetItem[];
}
