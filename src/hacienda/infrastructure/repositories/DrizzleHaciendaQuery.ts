import { eq } from 'drizzle-orm';
import { db } from '../../../shared/infrastructure/db/index.js';
import {
  properties,
  revenues,
  expenses,
  tenants,
  loans,
  recurringExpenses,
  rentIncreases,
} from '../../../shared/infrastructure/db/schema.js';
import { QueryData } from '../../application/services/HaciendaService.js';

export class DrizzleHaciendaQuery implements QueryData {
  async getProperty(id: number) {
    const [row] = await db.select().from(properties).where(eq(properties.id, id));
    if (!row) return null;
    return {
      ...row,
      purchasePrice: row.purchasePrice / 100,
      cadastralValue: row.cadastralValue ? row.cadastralValue / 100 : null,
      buildingValue: row.buildingValue ? row.buildingValue / 100 : null,
    };
  }

  async getRevenuesByProperty(propertyId: number) {
    const rows = await db.select().from(revenues).where(eq(revenues.propertyId, propertyId));
    return rows.map(r => ({ ...r, amount: r.amount / 100 }));
  }

  async getExpensesByProperty(propertyId: number) {
    const rows = await db.select().from(expenses).where(eq(expenses.propertyId, propertyId));
    return rows.map(r => ({ ...r, amount: r.amount / 100 }));
  }

  async getTenantsByProperty(propertyId: number) {
    const rows = await db.select().from(tenants).where(eq(tenants.propertyId, propertyId));
    const allIncreases = await db.select().from(rentIncreases);
    const increaseMap = new Map<number, any[]>();
    for (const inc of allIncreases) {
      if (!increaseMap.has(inc.tenantId)) increaseMap.set(inc.tenantId, []);
      increaseMap.get(inc.tenantId)!.push({
        id: inc.id,
        tenantId: inc.tenantId,
        yearOffset: inc.yearOffset,
        percentage: inc.percentage,
        applied: !!inc.applied,
      });
    }
    return rows.map(r => ({
      ...r,
      monthlyRent: r.monthlyRent / 100,
      rentIncreases: increaseMap.get(r.id) || [],
    }));
  }

  async getLoansByProperty(propertyId: number) {
    const rows = await db.select().from(loans).where(eq(loans.propertyId, propertyId));
    return rows.map(l => ({
      ...l,
      principal: l.principal / 100,
      actualPayment: l.actualPayment ? l.actualPayment / 100 : null,
    }));
  }

  async getRecurringExpensesByProperty(propertyId: number) {
    const rows = await db.select().from(recurringExpenses).where(eq(recurringExpenses.propertyId, propertyId));
    return rows.map(r => ({ ...r, amount: r.amount / 100 }));
  }

  async getAllProperties() {
    const rows = await db.select().from(properties);
    return rows.map(r => ({
      ...r,
      purchasePrice: r.purchasePrice / 100,
      cadastralValue: r.cadastralValue ? r.cadastralValue / 100 : null,
      buildingValue: r.buildingValue ? r.buildingValue / 100 : null,
    }));
  }

  async getAllTenants() {
    const rows = await db.select().from(tenants);
    const allIncreases = await db.select().from(rentIncreases);
    const increaseMap = new Map<number, any[]>();
    for (const inc of allIncreases) {
      if (!increaseMap.has(inc.tenantId)) increaseMap.set(inc.tenantId, []);
      increaseMap.get(inc.tenantId)!.push({
        id: inc.id,
        tenantId: inc.tenantId,
        yearOffset: inc.yearOffset,
        percentage: inc.percentage,
        applied: !!inc.applied,
      });
    }
    return rows.map(r => ({
      ...r,
      monthlyRent: r.monthlyRent / 100,
      rentIncreases: increaseMap.get(r.id) || [],
    }));
  }

  async getAllLoans() {
    const rows = await db.select().from(loans);
    return rows.map(l => ({
      ...l,
      principal: l.principal / 100,
      actualPayment: l.actualPayment ? l.actualPayment / 100 : null,
    }));
  }

  async getAllRecurringExpenses() {
    const rows = await db.select().from(recurringExpenses);
    return rows.map(r => ({ ...r, amount: r.amount / 100 }));
  }

  async getAllRevenues() {
    const rows = await db.select().from(revenues);
    return rows.map(r => ({ ...r, amount: r.amount / 100 }));
  }

  async getAllExpenses() {
    const rows = await db.select().from(expenses);
    return rows.map(r => ({ ...r, amount: r.amount / 100 }));
  }
}
