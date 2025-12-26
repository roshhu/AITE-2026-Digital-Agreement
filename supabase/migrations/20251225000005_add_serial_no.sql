
-- Update volunteers table to include serial_no
ALTER TABLE volunteers ADD COLUMN serial_no SERIAL;

-- If you want to reset serial_no or start from specific number, you can do:
-- ALTER SEQUENCE volunteers_serial_no_seq RESTART WITH 1001;
