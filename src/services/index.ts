import { createService } from './baseService';
import { Transaction, Protection, Savings, Investment, ZakatRecord, NetWorthItem, BudgetProfile, UserProfile, RetirementSettings, ZakatSettings, InheritanceSettings } from '../types';
import { DEFAULT_BUDGET_ITEMS } from '../constants';
import { getActiveUserId } from './sessionStore';

const baseBudgetService = createService<BudgetProfile>('budget');

let isBootstrappingBudget = false;

const customBudgetService = {
  ...baseBudgetService,
  subscribe: (callback: (data: BudgetProfile[]) => void, overrideUserId?: string) => {
    return baseBudgetService.subscribe(async (profiles) => {
      if (profiles && profiles.length > 0) {
        callback(profiles);
      } else if (!isBootstrappingBudget) {
        isBootstrappingBudget = true;
        const uid = overrideUserId || getActiveUserId();
        if (uid) {
          try {
            await baseBudgetService.add({
              items: [...DEFAULT_BUDGET_ITEMS],
              lastUpdated: new Date().toISOString()
            }, uid);
          } catch (error) {
            console.error('Error auto-bootstrapping budget:', error);
          } finally {
            isBootstrappingBudget = false;
          }
        } else {
          isBootstrappingBudget = false;
        }
      }
    }, overrideUserId);
  }
};

export const cashflowService = createService<Transaction>('transactions');
export const protectionService = createService<Protection>('protection');
export const savingsService = createService<Savings>('savings');
export const investmentService = createService<Investment>('investments');
export const zakatService = createService<ZakatRecord>('zakat');
export const netWorthService = createService<NetWorthItem>('networth');
export const budgetService = customBudgetService;
export const profileService = createService<UserProfile>('userProfiles');
export const retirementService = createService<RetirementSettings>('retirementSettings');
export const zakatSettingsService = createService<ZakatSettings>('zakatSettings');
export const inheritanceSettingsService = createService<InheritanceSettings>('inheritanceSettings');
