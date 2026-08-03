DELETE FROM public.relay_directory WHERE node_id LIKE 'mob-test-%';
DELETE FROM public.relay_envelopes WHERE pkt_id LIKE 'pkt-test-%';