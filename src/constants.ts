import { BudgetItem } from "./types";

export const DEFAULT_BUDGET_ITEMS: BudgetItem[] = [
  // Income
  { id: '1', category: 'income', subCategory: 'active', label: 'Gaji Asas', monthly: 0 },
  { id: '2', category: 'income', subCategory: 'active', label: 'Elaun', monthly: 0 },
  { id: '3', category: 'income', subCategory: 'active', label: 'Bonus', monthly: 0 },
  { id: '4', category: 'income', subCategory: 'deduction', label: '(-) KWSP', monthly: 0 },
  { id: '5', category: 'income', subCategory: 'deduction', label: '(-) PCB', monthly: 0 },
  { id: '6', category: 'income', subCategory: 'deduction', label: '(-) Zakat', monthly: 0 },
  { id: '7', category: 'income', subCategory: 'additional', label: 'Bisnes Lain', monthly: 0 },
  
  // Rental Income
  { id: 'rent1', category: 'income', subCategory: 'rental', label: 'Hartanah 1', monthly: 0, rentalCollection: 0, installment: 0 },
  
  // Expenses
  { id: 'e1', category: 'expense', subCategory: 'Debt', label: 'Hutang Perumahan', monthly: 0 },
  { id: 'e2', category: 'expense', subCategory: 'Debt', label: 'Hutang Kenderaan', monthly: 0 },
  { id: 'e3', category: 'expense', subCategory: 'Debt', label: 'Hutang Pendidikan', monthly: 0 },
  { id: 'e4', category: 'expense', subCategory: 'Debt', label: 'Pembiayaan Peribadi', monthly: 0 },
  { id: 'e5', category: 'expense', subCategory: 'Debt', label: 'Hutang Runcit', monthly: 0 },
  
  { id: 'e6', category: 'expense', subCategory: 'Home', label: 'Sewa', monthly: 0 },
  { id: 'e7', category: 'expense', subCategory: 'Home', label: 'Toiletries / Perabot', monthly: 0 },
  { id: 'e8', category: 'expense', subCategory: 'Home', label: 'Pembantu Rumah', monthly: 0 },
  
  { id: 'e9', category: 'expense', subCategory: 'Transport', label: 'Petrol', monthly: 0 },
  { id: 'e10', category: 'expense', subCategory: 'Transport', label: 'Tol', monthly: 0 },
  { id: 'e11', category: 'expense', subCategory: 'Transport', label: 'Parking', monthly: 0 },
  { id: 'e12', category: 'expense', subCategory: 'Transport', label: 'Takaful & Cukai Jalan', monthly: 0 },
  { id: 'e13', category: 'expense', subCategory: 'Transport', label: 'Servis', monthly: 0 },
  
  { id: 'e14', category: 'expense', subCategory: 'Food', label: 'Barang Dapur', monthly: 0 },
  { id: 'e15', category: 'expense', subCategory: 'Food', label: 'Makan Luar', monthly: 0 },
  
  { id: 'e16', category: 'expense', subCategory: 'Air', label: 'Bil Air', monthly: 0 },
  { id: 'e17', category: 'expense', subCategory: 'Elektrik', label: 'Bil Elektrik', monthly: 0 },
  { id: 'e18', category: 'expense', subCategory: 'Utility', label: 'Telefon / Internet', monthly: 0 },

  { id: 'e19', category: 'expense', subCategory: 'Children', label: 'Susu / Makanan Bayi', monthly: 0 },
  { id: 'e20', category: 'expense', subCategory: 'Children', label: 'Pengasuh', monthly: 0 },
  { id: 'e21', category: 'expense', subCategory: 'Children', label: 'Lampin / Diapers', monthly: 0 },
  { id: 'e22', category: 'expense', subCategory: 'Children', label: 'Takaful Anak', monthly: 0 },

  { id: 'e23', category: 'expense', subCategory: 'Self', label: 'Pakaian', monthly: 0 },
  { id: 'e24', category: 'expense', subCategory: 'Self', label: 'Kosmetik / Dandanan', monthly: 0 },

  { id: 'e25', category: 'expense', subCategory: 'Entertainment', label: 'Melancong', monthly: 0 },
  { id: 'e26', category: 'expense', subCategory: 'Entertainment', label: 'Astro / Entertainment', monthly: 0 },
  { id: 'e27', category: 'expense', subCategory: 'Entertainment', label: 'Unifi / Broadband', monthly: 0 },

  { id: 'e28', category: 'expense', subCategory: 'Gift', label: 'Zakat / Sedekah', monthly: 0 },
  { id: 'e29', category: 'expense', subCategory: 'Gift', label: 'Ibubapa', monthly: 0 },
  { id: 'e30', category: 'expense', subCategory: 'Gift', label: 'Cukai', monthly: 0 },

  // Surplus / Lebihan
  { id: 's1', category: 'surplus', subCategory: 'Saving', label: 'Tabung Haji', monthly: 0 },
  { id: 's2', category: 'surplus', subCategory: 'Saving', label: 'ASB', monthly: 0 },
  { id: 's3', category: 'surplus', subCategory: 'Saving', label: '', monthly: 0 },
  
  { id: 's4', category: 'surplus', subCategory: 'Protection', label: 'Sijil Takaful 1', monthly: 0 },
  { id: 's5', category: 'surplus', subCategory: 'Protection', label: 'Sijil Takaful 2', monthly: 0 },
  { id: 's6', category: 'surplus', subCategory: 'Protection', label: '', monthly: 0 },
  
  { id: 's7', category: 'surplus', subCategory: 'Investment', label: 'Autodebit 1', monthly: 0 },
  { id: 's8', category: 'surplus', subCategory: 'Investment', label: 'Autodebit 2', monthly: 0 },
  { id: 's9', category: 'surplus', subCategory: 'Investment', label: '', monthly: 0 },
];
