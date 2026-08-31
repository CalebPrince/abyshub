-- Contact-page messages are enquiries too, but keeping their source distinct
-- lets the unified inbox tell a general message from a quote request.
alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check
  check (source in ('enquiry', 'contact', 'chat', 'whatsapp', 'manual'));
