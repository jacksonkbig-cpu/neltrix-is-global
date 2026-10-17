-- Document the only intended database role allowed to access internal rate-limit state.
create policy "Service role manages quote rate limits"
on private.quote_rate_limits
for all
to service_role
using (true)
with check (true);
