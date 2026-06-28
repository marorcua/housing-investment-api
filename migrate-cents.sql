-- Migration: convert existing euro amounts to cents
-- Run before starting the app with the new schema

UPDATE properties SET purchase_price = ROUND(purchase_price * 100);
UPDATE properties SET cadastral_value = ROUND(cadastral_value * 100);
UPDATE properties SET building_value = ROUND(building_value * 100);

UPDATE revenues SET amount = ROUND(amount * 100);

UPDATE expenses SET amount = ROUND(amount * 100);

UPDATE tenants SET monthly_rent = ROUND(monthly_rent * 100);

UPDATE loans SET principal = ROUND(principal * 100);

UPDATE recurring_expenses SET amount = ROUND(amount * 100);
