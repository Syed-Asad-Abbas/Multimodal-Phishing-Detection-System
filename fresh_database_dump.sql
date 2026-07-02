--
-- PostgreSQL database dump
--

\restrict OmRvYZw3PBUuELX1LDY1aWHPQslfQ7MG2tWFt0bfNEsvRWDpp9CLygzTpNN6fKU

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: admin; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA admin;


ALTER SCHEMA admin OWNER TO postgres;

--
-- Name: analytics; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA analytics;


ALTER SCHEMA analytics OWNER TO postgres;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO postgres;

--
-- Name: core; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA core;


ALTER SCHEMA core OWNER TO postgres;

--
-- Name: mlops; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA mlops;


ALTER SCHEMA mlops OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: auth; Owner: postgres
--

CREATE TYPE auth."Role" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE auth."Role" OWNER TO postgres;

--
-- Name: ReviewStatus; Type: TYPE; Schema: core; Owner: postgres
--

CREATE TYPE core."ReviewStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE core."ReviewStatus" OWNER TO postgres;

--
-- Name: ScanStatus; Type: TYPE; Schema: core; Owner: postgres
--

CREATE TYPE core."ScanStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE core."ScanStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: admin; Owner: postgres
--

CREATE TABLE admin.audit_logs (
    id text NOT NULL,
    admin_id text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    details text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE admin.audit_logs OWNER TO postgres;

--
-- Name: daily_scan_stats; Type: TABLE; Schema: analytics; Owner: postgres
--

CREATE TABLE analytics.daily_scan_stats (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    total_scans integer DEFAULT 0 NOT NULL,
    benign_count integer DEFAULT 0 NOT NULL,
    phishing_count integer DEFAULT 0 NOT NULL,
    unique_users integer DEFAULT 0 NOT NULL
);


ALTER TABLE analytics.daily_scan_stats OWNER TO postgres;

--
-- Name: model_metrics_daily; Type: TABLE; Schema: analytics; Owner: postgres
--

CREATE TABLE analytics.model_metrics_daily (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    false_positive_rate double precision,
    true_positive_rate double precision,
    accuracy double precision,
    total_samples integer DEFAULT 0 NOT NULL
);


ALTER TABLE analytics.model_metrics_daily OWNER TO postgres;

--
-- Name: email_verification_tokens; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.email_verification_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE auth.email_verification_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.password_reset_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE auth.password_reset_tokens OWNER TO postgres;

--
-- Name: two_factor_tokens; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.two_factor_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE auth.two_factor_tokens OWNER TO postgres;

--
-- Name: user_sessions; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.user_sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    refresh_token_hash text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address text,
    user_agent text
);


ALTER TABLE auth.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.users (
    id text NOT NULL,
    name text,
    email text NOT NULL,
    password_hash text,
    role auth."Role" DEFAULT 'USER'::auth."Role" NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    is_2fa_enabled boolean DEFAULT false NOT NULL,
    last_login timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    avatar_url text,
    google_id text,
    provider text DEFAULT 'local'::text NOT NULL
);


ALTER TABLE auth.users OWNER TO postgres;

--
-- Name: malicious_ip_observations; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.malicious_ip_observations (
    id text NOT NULL,
    scan_id text NOT NULL,
    ip_address text NOT NULL,
    geo_lat double precision,
    geo_long double precision,
    country text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE core.malicious_ip_observations OWNER TO postgres;

--
-- Name: queued_jobs; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.queued_jobs (
    id text NOT NULL,
    job_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE core.queued_jobs OWNER TO postgres;

--
-- Name: reviews; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.reviews (
    id text NOT NULL,
    user_id text NOT NULL,
    rating integer NOT NULL,
    comment text,
    status core."ReviewStatus" DEFAULT 'PENDING'::core."ReviewStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE core.reviews OWNER TO postgres;

--
-- Name: scan_explanations; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.scan_explanations (
    id text NOT NULL,
    scan_result_id text NOT NULL,
    llm_text text NOT NULL
);


ALTER TABLE core.scan_explanations OWNER TO postgres;

--
-- Name: scan_results; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.scan_results (
    id text NOT NULL,
    scan_id text NOT NULL,
    prediction text NOT NULL,
    confidence_score double precision NOT NULL,
    phishing_probability double precision NOT NULL
);


ALTER TABLE core.scan_results OWNER TO postgres;

--
-- Name: scan_screenshots; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.scan_screenshots (
    id text NOT NULL,
    scan_result_id text NOT NULL,
    image_url text,
    base64_data text
);


ALTER TABLE core.scan_screenshots OWNER TO postgres;

--
-- Name: scan_shap_values; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.scan_shap_values (
    id text NOT NULL,
    scan_result_id text NOT NULL,
    feature_name text NOT NULL,
    shap_value double precision NOT NULL,
    modality text NOT NULL
);


ALTER TABLE core.scan_shap_values OWNER TO postgres;

--
-- Name: scans; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.scans (
    id text NOT NULL,
    user_id text,
    url text NOT NULL,
    status core."ScanStatus" DEFAULT 'PENDING'::core."ScanStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp(3) without time zone,
    deleted_by text
);


ALTER TABLE core.scans OWNER TO postgres;

--
-- Name: testimonials; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.testimonials (
    id text NOT NULL,
    review_id text NOT NULL,
    published_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    display_text text
);


ALTER TABLE core.testimonials OWNER TO postgres;

--
-- Name: pipeline_health_logs; Type: TABLE; Schema: mlops; Owner: postgres
--

CREATE TABLE mlops.pipeline_health_logs (
    id text NOT NULL,
    service_name text NOT NULL,
    status text NOT NULL,
    latency_ms integer,
    error_details text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE mlops.pipeline_health_logs OWNER TO postgres;

--
-- Name: retraining_jobs; Type: TABLE; Schema: mlops; Owner: postgres
--

CREATE TABLE mlops.retraining_jobs (
    id text NOT NULL,
    triggered_by text NOT NULL,
    start_time timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time timestamp(3) without time zone,
    status text NOT NULL,
    metrics_summary text
);


ALTER TABLE mlops.retraining_jobs OWNER TO postgres;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: admin; Owner: postgres
--

COPY admin.audit_logs (id, admin_id, action, entity_type, entity_id, details, created_at) FROM stdin;
c06d50c8-897e-43b1-8c56-436bb8aef9bb	0ad2d04a-0d38-4873-9277-d6933a89633b	UPDATE_ROLE	USER	c261e4fc-9ffa-497f-b498-24ff2b6a7370	Updated user role from USER to ADMIN for user: syedasadabbas.1815@gmail.com	2026-04-09 07:35:30.239
731afedd-dbdc-4397-b9cc-0e981892f903	0ad2d04a-0d38-4873-9277-d6933a89633b	UPDATE_ROLE	USER	c261e4fc-9ffa-497f-b498-24ff2b6a7370	Updated user role from ADMIN to USER for user: syedasadabbas.1815@gmail.com	2026-04-09 07:35:36.635
9d71a8ad-15c8-459e-b0ba-d5beea87137c	c261e4fc-9ffa-497f-b498-24ff2b6a7370	UPDATE_ROLE	USER	0ad2d04a-0d38-4873-9277-d6933a89633b	Updated user role from ADMIN to USER for user: lawlite2005@gmail.com	2026-04-20 21:34:11.209
545477e3-51db-4683-b448-1348c0f6c828	c261e4fc-9ffa-497f-b498-24ff2b6a7370	UPDATE_ROLE	USER	0ad2d04a-0d38-4873-9277-d6933a89633b	Updated user role from USER to ADMIN for user: lawlite2005@gmail.com	2026-04-20 21:34:12.018
5ed1cd3e-aa4f-4819-8cf9-11cb6724dd87	c261e4fc-9ffa-497f-b498-24ff2b6a7370	UPDATE_ROLE	USER	0ad2d04a-0d38-4873-9277-d6933a89633b	Updated user role from ADMIN to USER for user: lawlite2005@gmail.com	2026-04-26 03:13:11.942
72460b1d-36b0-4106-8119-3fc7c039c9aa	c261e4fc-9ffa-497f-b498-24ff2b6a7370	UPDATE_ROLE	USER	0ad2d04a-0d38-4873-9277-d6933a89633b	Updated user role from USER to ADMIN for user: lawlite2005@gmail.com	2026-04-26 03:13:49.203
\.


--
-- Data for Name: daily_scan_stats; Type: TABLE DATA; Schema: analytics; Owner: postgres
--

COPY analytics.daily_scan_stats (id, date, total_scans, benign_count, phishing_count, unique_users) FROM stdin;
\.


--
-- Data for Name: model_metrics_daily; Type: TABLE DATA; Schema: analytics; Owner: postgres
--

COPY analytics.model_metrics_daily (id, date, false_positive_rate, true_positive_rate, accuracy, total_samples) FROM stdin;
\.


--
-- Data for Name: email_verification_tokens; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.email_verification_tokens (id, user_id, token_hash, expires_at) FROM stdin;
1eb3db1d-13df-475c-ae0d-72ae46080647	0ad2d04a-0d38-4873-9277-d6933a89633b	4b2afb1c256227af405dd085b696ec3e9b4568a06108ac3219dda123cb6e245e	2026-04-09 18:03:09.648
00d11c04-a2a0-418b-98e7-82611a44adce	c261e4fc-9ffa-497f-b498-24ff2b6a7370	96debae3b09e7e16ef5e0d93f92d5bdad721b7a37d31f9835869f8892c38692f	2026-04-10 07:35:15.826
c0be9813-d68b-4703-ab5f-ad4b8f5933fc	4335e9b2-e48c-49c3-9e17-b033d6acfd02	2ff243ba5913326f92d265be042ff1914034902d6357fedbe35826be6038f32e	2026-04-10 14:27:23.214
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.password_reset_tokens (id, user_id, token_hash, expires_at) FROM stdin;
56ddc291-1d3c-4f56-b3c4-572f6d71ee60	0ad2d04a-0d38-4873-9277-d6933a89633b	72e637fef1e0341bc3575ceadda6bc9b6f123e731962de0ff76ecc2e45f7abc2	2026-04-20 22:32:07.193
ae458dc8-faea-4c46-bd49-1a7e78920272	c261e4fc-9ffa-497f-b498-24ff2b6a7370	e9eb57f1133bf410e80d76cda986e7f75a8e30c96022fc30ea1f17b85c39ac72	2026-04-28 12:28:31.74
\.


--
-- Data for Name: two_factor_tokens; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.two_factor_tokens (id, user_id, token_hash, expires_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.user_sessions (id, user_id, refresh_token_hash, expires_at, created_at, ip_address, user_agent) FROM stdin;
7755937c-0190-4573-a7af-7e3a14a9d301	0ad2d04a-0d38-4873-9277-d6933a89633b	2cb58aec44c84a90ff4548e4b36bedbcb1112f67cdaac230f0175a168a90ada0	2026-04-15 18:03:11.935	2026-04-08 18:03:11.936	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
cede32a3-1115-4a09-bddc-73b56b54b1ef	0ad2d04a-0d38-4873-9277-d6933a89633b	6de8a08769bcd6709acdbf5f7612eff64c0100580b21223b4dbd470623dcd206	2026-04-15 18:22:14.54	2026-04-08 18:22:14.542	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
f2d6e42c-87a5-464c-8857-d74b53d7dabe	0ad2d04a-0d38-4873-9277-d6933a89633b	a43faeae5749d0e0975d553dab567a07f87a6d5ca7cf310034312f7475a8da6b	2026-04-15 18:29:42.002	2026-04-08 18:29:42.004	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
69a9c3ab-a9c4-45f8-ba49-9c16936a931a	0ad2d04a-0d38-4873-9277-d6933a89633b	7a61c26e34daf96c3b3b49ea946ce9ac9a19695d11498571d68b1090f8d1feec	2026-04-15 18:39:43.358	2026-04-08 18:39:43.359	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
8416d04e-812f-42aa-b540-fc10d66b8fca	0ad2d04a-0d38-4873-9277-d6933a89633b	23b813b834a787e2587e66021b956a1b9287cd4cda982ed20ce6f6ab06d8c38a	2026-04-15 18:57:55.23	2026-04-08 18:57:55.231	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
4889269d-3a0b-46a5-aa2c-4d2f75827e8a	0ad2d04a-0d38-4873-9277-d6933a89633b	edc89a1a74a54b4f466956565c50c2dcb3e1722354816ad2a9386b3280fdcda4	2026-04-15 18:58:55.016	2026-04-08 18:58:55.018	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
685ca5aa-5aac-4dd4-81cf-06835ef0509b	0ad2d04a-0d38-4873-9277-d6933a89633b	f73e74d058ca8debf611659394cb7fd34a6873652904438c4724049f9588e113	2026-04-15 19:04:58.861	2026-04-08 19:04:58.863	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
a725013a-a82f-44d0-8ab2-fad8509ae870	0ad2d04a-0d38-4873-9277-d6933a89633b	bca5159b7f7f279284f8a3a1c2f067bff291ad4c2d02f2aeb0d25916a79146c1	2026-04-15 20:54:52.424	2026-04-08 20:54:52.425	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
1e678452-498d-4ddd-984d-866051ebff2d	0ad2d04a-0d38-4873-9277-d6933a89633b	799e66cf10918cec145090da99537a26428306edba3374ed18fd8255813291d5	2026-04-16 07:08:34.467	2026-04-09 07:08:34.469	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
8a426790-08db-41d0-8784-c77de5f827e8	0ad2d04a-0d38-4873-9277-d6933a89633b	30de31a8490b73242893a5e5d7e37504ff4429619dfbf6a0cd216bbfdd081fb5	2026-04-16 07:33:09.953	2026-04-09 07:33:09.954	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
7af73e4e-9dee-4726-bb2a-95546b1e1bac	c261e4fc-9ffa-497f-b498-24ff2b6a7370	ee1c2200ce9b68985c2953288f0d8ea687953ce7ef28927923b080b0820062e1	2026-04-16 07:35:17.178	2026-04-09 07:35:17.178	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
41e281f9-99e0-4aec-9175-d2df4e1069c2	0ad2d04a-0d38-4873-9277-d6933a89633b	763da2f44588b7f364b24e8d535e94167eff14c7f9c7260510d73dc579c50c10	2026-04-16 07:50:34.825	2026-04-09 07:50:34.827	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
ee498a90-17e7-4e8f-a41f-b725e3bf66f3	0ad2d04a-0d38-4873-9277-d6933a89633b	93d4ae9e9349f31b2e1a9c112cb35d73cde945fbcb2b452399300b022d770826	2026-04-16 11:31:35.374	2026-04-09 11:31:35.375	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
5dcee1e3-c3a7-4c01-8a3a-5a6994fda5db	0ad2d04a-0d38-4873-9277-d6933a89633b	69a3d69b46d622b524e772cc35126f3ef8c4b218b8e86663a5c07750b7da1f27	2026-04-16 11:32:22.388	2026-04-09 11:32:22.389	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
e61e6a46-9017-4f24-90b4-5e385d413508	0ad2d04a-0d38-4873-9277-d6933a89633b	935406d22d3b363d44b1df6059ede6e63cbdc061d96c166ce8c2c5120a6f9268	2026-04-16 12:04:48.387	2026-04-09 12:04:48.389	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
86b08775-af9d-421d-9a7c-eb464dbccbf6	0ad2d04a-0d38-4873-9277-d6933a89633b	5fdf463dd1b7d075d8b9cc0ba977e3758e729b7e13bd33b73d8f47a577d0bc7e	2026-04-16 12:10:57.912	2026-04-09 12:10:57.913	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
8686a6e3-f011-4082-a806-76932d7288dc	0ad2d04a-0d38-4873-9277-d6933a89633b	1cf90582a3c5d31e2b013d73cbe5c9fdae4c29cf37f6256da500b3c1ba02d7a6	2026-04-16 14:10:15.771	2026-04-09 14:10:15.773	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
23474e2b-2e4e-4a5f-827a-668e80bb1093	0ad2d04a-0d38-4873-9277-d6933a89633b	24be22e69938192bbf206b509373604c0a99698abbd5b84becb8c9d4f039daa5	2026-04-16 14:11:14.713	2026-04-09 14:11:14.715	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
70e44279-fa0d-4195-b66b-cee069ce5a8f	0ad2d04a-0d38-4873-9277-d6933a89633b	e118efdc78f490f19f8cd9d235fea2e7a4e75cc2d496cd47467ac0c21a464694	2026-04-16 14:26:23.627	2026-04-09 14:26:23.628	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
cb5d2207-f5c5-4048-b0cd-8d21144f9a3b	4335e9b2-e48c-49c3-9e17-b033d6acfd02	d6cb3e161f6c63fb8da476123ed5ab2ed285d3bc5ade6f6b4b2cad9e0be6892e	2026-04-16 14:27:25.618	2026-04-09 14:27:25.62	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
27c4d760-1891-47e0-9c3a-7dcb69074368	0ad2d04a-0d38-4873-9277-d6933a89633b	da2e4c78468acd5318247b7612d9fb099ccc930e4c5080f080c926b9235ca701	2026-04-16 14:56:20.568	2026-04-09 14:56:20.569	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
00c1c1e6-e9a5-4a06-be97-e71163f7ddf2	c261e4fc-9ffa-497f-b498-24ff2b6a7370	0823376afab117fb056cc746019e8958fce80529b1264f21e1b7a2ee7343bfc6	2026-04-16 14:58:32.874	2026-04-09 14:58:32.875	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
d16b2db1-f279-4f9f-8b09-4736cecd9d34	0ad2d04a-0d38-4873-9277-d6933a89633b	ec431abd739e8bd6e5b26ad2f71a3e34bbbdc444d867ad7f7e3583c294a64516	2026-04-16 15:13:10.07	2026-04-09 15:13:10.072	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
216c1c47-e0e4-48e8-a368-496b0cc19e56	0ad2d04a-0d38-4873-9277-d6933a89633b	4f27b91587cb659963d12aa298d36935f5ad1da4e25b464d67fad7abeb4bed6e	2026-04-16 15:40:28.428	2026-04-09 15:40:28.429	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
5ea3b48b-051d-444b-b5ad-8c9ecd5f7107	0ad2d04a-0d38-4873-9277-d6933a89633b	5fb9456c8cfb57ee5feb5ba2a14b2d2b934e2c94aff76773e0ac3609fd98c3cc	2026-04-16 15:55:49.389	2026-04-09 15:55:49.39	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
3cc3a6ac-02dd-4349-a562-4e1c0f42e4ed	0ad2d04a-0d38-4873-9277-d6933a89633b	142679812c22e6f3c92354a44c3b8979a9f4f09566f0501a07b530334feec3ca	2026-04-16 16:16:17.008	2026-04-09 16:16:17.011	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
f13b1627-361c-4e4a-8483-7772e4edeaf3	c261e4fc-9ffa-497f-b498-24ff2b6a7370	c063c6ad944c14f11b759aba4a190a12215a633a1549b8791578c9af041445e5	2026-04-16 16:20:41.61	2026-04-09 16:20:41.611	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
2b0d9172-1ccf-49b2-8da5-083acf81b586	0ad2d04a-0d38-4873-9277-d6933a89633b	bbeda00e88d535aef0c6368af4ac112b6a89c9cdcfdb15d63d981b05b20cc7d3	2026-04-16 16:23:34.081	2026-04-09 16:23:34.082	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
f4a117ad-f3a4-450b-98a3-dac2d20b66d9	0ad2d04a-0d38-4873-9277-d6933a89633b	b3510c407a84d8285ec60b2f99359b4edc44e0b234906cafb4aa415515bc4ef6	2026-04-16 16:35:09.572	2026-04-09 16:35:09.573	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
9973be3e-812d-48a8-8622-b3213ad39d62	0ad2d04a-0d38-4873-9277-d6933a89633b	832c4c2ff06452ecc85aa05cfa195ca9f7c523bc560ad6bb0713c863730ee101	2026-04-17 15:20:22.686	2026-04-10 15:20:22.687	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
c257716a-c9d5-44dc-b3c5-9aabc853767f	0ad2d04a-0d38-4873-9277-d6933a89633b	eb9a10ffc3b39369bee00430fbeecbe621afa06d6f33ddebbb62b9cd7026da7b	2026-04-17 18:46:01.728	2026-04-10 18:46:01.729	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
7799524b-3b5a-4fd6-93fb-75aaae2f4ade	0ad2d04a-0d38-4873-9277-d6933a89633b	e1030d332ceaa74d1fac0a91b18897bc0dd4ce569410440d44123c3a9efa50a1	2026-04-17 19:03:32.356	2026-04-10 19:03:32.357	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
0271b470-acf8-41a3-b86a-9d89e7c5e243	0ad2d04a-0d38-4873-9277-d6933a89633b	f988f9559cc97253c9d4c9887c5a17746d6fbe638f6ef23eb0b82c06c28ec19f	2026-04-17 20:41:36.761	2026-04-10 20:41:36.762	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
33f401f5-2b2c-4ae6-8b32-08673639a6af	c261e4fc-9ffa-497f-b498-24ff2b6a7370	7fb0c014c3ff38a38143e661deefb6b5711b69105d2a953ad22f26d4c16f1c05	2026-04-17 20:42:54.958	2026-04-10 20:42:54.959	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
ef66d6e2-a7a5-4a16-9c73-1d1a16f83e0d	0ad2d04a-0d38-4873-9277-d6933a89633b	c300828e819e69266f75db7dde7459ea36a4b63cf27dd6780322f1e7d0e12d0d	2026-04-17 22:29:55.783	2026-04-10 22:29:55.784	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
a77c4f8d-d4e0-490e-afcc-39c55d445101	c261e4fc-9ffa-497f-b498-24ff2b6a7370	0b86d63431443573e10de6734f83d146bf0d6828fb33bae6fd61facb14e6f9d8	2026-04-17 22:35:23.892	2026-04-10 22:35:23.893	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
b533aa2a-a170-46b6-bc45-f3e2a3b749f7	c261e4fc-9ffa-497f-b498-24ff2b6a7370	ace2f2ccbd1924a5a739b626fec146f020e686e30e452383f06b8966cdab7d6f	2026-04-27 21:31:31.515	2026-04-20 21:31:31.517	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
0eb57903-e345-4f83-af75-410c5786cd5b	c261e4fc-9ffa-497f-b498-24ff2b6a7370	32c1b4336d8872156cffcc08a7666482c6a12349b0d64e3960f25bf2e3d3a315	2026-04-27 21:33:05.9	2026-04-20 21:33:05.901	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
7f0edc6c-3e59-433d-8a1d-a12dfbe7a9f8	c261e4fc-9ffa-497f-b498-24ff2b6a7370	399a5f26df2ad0be33af6c49bc9f891bc025da76d470a51bafb57a605771b36c	2026-04-27 21:33:49.671	2026-04-20 21:33:49.672	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
16dd2ef8-ba9b-4545-afe4-37ddee3f49f9	c261e4fc-9ffa-497f-b498-24ff2b6a7370	8e892cb92e4924a617837ed6a8916c264264e32b44ca5a1c02b7a0ea7a1eb334	2026-05-01 16:59:51.298	2026-04-24 16:59:51.3	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
d16768b8-8aec-4f26-968c-e75c890a55cd	c261e4fc-9ffa-497f-b498-24ff2b6a7370	a0bfd719ef03b6a9cfff9c84d66e3d31e80c6d440a3cc08f2ffab17dedf08b37	2026-05-01 17:27:48.644	2026-04-24 17:27:48.645	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
26e78a4a-953e-4543-baf3-6b4a0a2416de	c261e4fc-9ffa-497f-b498-24ff2b6a7370	4a6ea36a823d04de59a6543ac320db093c5d323876655f15cf264a7bc1a0fc15	2026-05-02 20:21:16.94	2026-04-25 20:21:16.941	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
8da7b4e8-50f8-4d8b-a335-a593b41d9ba9	0ad2d04a-0d38-4873-9277-d6933a89633b	b8288d54085274766c3322978eddc61d0bdd1508438a54dcd57099fc86c2b539	2026-05-02 20:22:50.36	2026-04-25 20:22:50.361	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
64696323-1d8c-4c4f-b39b-8e60bfb4df1d	0ad2d04a-0d38-4873-9277-d6933a89633b	7fbce41dec8e54a302a6994201254f5f3e0b2275294c1cc87f3684b6d4b42ec3	2026-05-02 23:54:50.715	2026-04-25 23:54:50.716	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
5d4cda6b-77a2-4c8a-8806-32923afb774e	0ad2d04a-0d38-4873-9277-d6933a89633b	9e2b53bf0be1c18d84c956ee4599ed3bd1e6f1060ac8b2a7210c35ef071f293e	2026-05-02 23:55:24.432	2026-04-25 23:55:24.433	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
2378ff67-3521-4ea5-b43e-78a24c71d303	0ad2d04a-0d38-4873-9277-d6933a89633b	c879696f6913039843a10aa3f642ccb86a4ee4594ea54fd6570c848e37d17506	2026-05-03 03:07:25.95	2026-04-26 03:07:25.952	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
368d7d1c-1b6c-4085-b950-215c0b38f3de	0ad2d04a-0d38-4873-9277-d6933a89633b	cf06279466995933831467ba7f78c8a77d8d92203285961610c96824579a79a3	2026-05-03 03:07:36.866	2026-04-26 03:07:36.868	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
6e8dd603-2773-4717-85f2-49cdd51a94bd	c261e4fc-9ffa-497f-b498-24ff2b6a7370	026d1ed15e8d17bbf151445991565ea689108538af80aa971252674c7838e6e8	2026-05-03 03:08:40.417	2026-04-26 03:08:40.417	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
fbcb9b66-96c4-4e92-9690-87574310601c	c261e4fc-9ffa-497f-b498-24ff2b6a7370	ffd3733a3b542edd95e9e7b1b52ea4e49b296216c719dcc0365d40b606aea89b	2026-05-03 03:09:15.869	2026-04-26 03:09:15.87	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
a306029b-aa5a-4860-973f-35d29d353774	c261e4fc-9ffa-497f-b498-24ff2b6a7370	d2a6da3f39920fbe2c36ef19cf6747d8381edfc34abc7d5f0677fcdd38138d04	2026-05-03 03:10:32.756	2026-04-26 03:10:32.757	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
13278515-4cc7-4bb7-90cf-4a3a1c2e7cc2	c261e4fc-9ffa-497f-b498-24ff2b6a7370	0fc952f8a5afdf51bc60896bbd2a14af94300366ad74590adb6dd154570cf0bb	2026-05-03 03:12:05.049	2026-04-26 03:12:05.05	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
fe39f83c-44e6-455c-a99a-11b555439385	0ad2d04a-0d38-4873-9277-d6933a89633b	8dbe803aa77925507263a502e6a8c468122941a79d56e67fa0f0900150864188	2026-05-03 03:13:04.208	2026-04-26 03:13:04.209	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
6b94c91b-5682-4c4e-a1a8-e103a605ba65	0ad2d04a-0d38-4873-9277-d6933a89633b	a0a42f8855fa71e3f5299fb396fa5e5fe334d74a74faf90c1a481a2c590ee34c	2026-05-03 03:14:05.233	2026-04-26 03:14:05.234	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
ec88c0da-c20f-4228-afac-414b76d1458d	0ad2d04a-0d38-4873-9277-d6933a89633b	f8b67c89eea2cd5fbe47464d47d728703aade3fbf9bb6bda07c78db9f7b7e07f	2026-05-05 09:04:58.148	2026-04-28 09:04:58.149	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
e171d7f0-cb89-4663-8655-42fe944a4901	0ad2d04a-0d38-4873-9277-d6933a89633b	53d7ff8966b355dec27884f83d71aabab6237ccc4d29d6abe3bcc1ba4a6e1e15	2026-05-05 09:16:51.517	2026-04-28 09:16:51.517	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
5011761c-71e8-4325-8f5e-90bf2c16ebf6	0ad2d04a-0d38-4873-9277-d6933a89633b	75f1734070cf6908face8b58d58e0f06dfb1cc1414a588baad737456f8129db2	2026-05-05 09:32:48.036	2026-04-28 09:32:48.037	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
36d7c6ab-0341-4e0e-9a0a-20b5f71b9874	0ad2d04a-0d38-4873-9277-d6933a89633b	fd03e289e6b82a455fdefc35c380bc1f8a6a3de33c1d199cc36caf7ce160a903	2026-05-05 09:44:08.903	2026-04-28 09:44:08.904	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
bdc76fed-b966-4fea-8363-39ade516ad87	c261e4fc-9ffa-497f-b498-24ff2b6a7370	5aace9ff811d9ac2bdb1500cd84c3185bcdc5af086bd68e8b46c83b6a706bb17	2026-05-05 11:29:26.952	2026-04-28 11:29:26.952	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
40691832-bc05-48a3-99a5-60eb5683b94f	0ad2d04a-0d38-4873-9277-d6933a89633b	179a7773781c154c73d7828d5ae83e3f325953a766fa1a6d0dc4a685efa2b21a	2026-05-05 11:29:45.222	2026-04-28 11:29:45.222	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
529d044a-79f8-424e-a774-e71ab2d3c08a	0ad2d04a-0d38-4873-9277-d6933a89633b	ea0b520433319cb8a259325dde30f1c711585f0f2ec207c67c90981945a58ae4	2026-05-05 11:47:02.258	2026-04-28 11:47:02.26	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
14e814bf-06c6-49ef-8d7f-b1d4ef7de335	0ad2d04a-0d38-4873-9277-d6933a89633b	901804ad6c9690713f195f19a05674203778437a6c7c92251979b4befc68543a	2026-05-06 23:19:37.093	2026-04-29 23:19:37.094	127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1
b5e05b83-5323-4055-a6b8-86db88e4f4c2	c261e4fc-9ffa-497f-b498-24ff2b6a7370	19cf62b714e8c76a4d9772c3f1c1f35eeec46e4eae7b003f88dabc491cf9a8e2	2026-05-06 23:28:34.028	2026-04-29 23:28:34.029	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
12b6cbb5-9f1c-402c-9a83-96cd454b99f2	c261e4fc-9ffa-497f-b498-24ff2b6a7370	e7432078db611b20dfa8e092a2371ab3e35a50175cc9a9e72d89413d953c1acd	2026-05-07 02:19:19.764	2026-04-30 02:19:19.764	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
bf58a7a6-85cd-4eda-9317-76df19a0f019	0ad2d04a-0d38-4873-9277-d6933a89633b	8965c169a14aa37b96c24db5a0c92cd252170fb1738de6411d3bcd162b63a71b	2026-05-08 20:38:15.929	2026-05-01 20:38:15.929	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
8be03211-2da9-4c36-b8cf-099f7fe03b7e	0ad2d04a-0d38-4873-9277-d6933a89633b	29501557fb884d87935919365503394fa0cad1275a58ed13f20b149a3002c612	2026-05-08 20:54:02.448	2026-05-01 20:54:02.449	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
5f5cdbb8-1dd6-4428-b29e-26bad0331ab2	0ad2d04a-0d38-4873-9277-d6933a89633b	bcef27f87583a921f866caea05f8224081f4488b435660a678c18144a994003b	2026-05-08 21:33:17.582	2026-05-01 21:33:17.582	127.0.0.1	Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1
36deecc9-7f4e-49bb-ba4f-dbfdc1616af9	0ad2d04a-0d38-4873-9277-d6933a89633b	9e9706411e9d69da3a73804e1ed26c3aa997a2fc56dff8b01fb001c5de9f4ebd	2026-05-10 22:17:51.222	2026-05-03 22:17:51.224	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
317b4bf9-b577-4ee3-b9cc-78f81cb05349	c261e4fc-9ffa-497f-b498-24ff2b6a7370	82ffb56c8d3f8a54564a52e906d0dab87f16ceb13319d13bf933eabe14cea05d	2026-05-10 23:06:33.369	2026-05-03 23:06:33.371	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
1e264b4d-023d-4c90-ac3b-6554a70b3cfd	c261e4fc-9ffa-497f-b498-24ff2b6a7370	dedeab85bd90631e6fdaa835bb6a36da871227cd32cd1f791332f1663cce8bfe	2026-05-11 00:12:21.8	2026-05-04 00:12:21.801	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
37d2b368-7f80-4cc5-a752-7b10e5c03e6a	c261e4fc-9ffa-497f-b498-24ff2b6a7370	5fd6d7546901ce9f8276e4a10423eb079ba29b8cecd4a172a937855ba8943359	2026-05-11 00:31:58.106	2026-05-04 00:31:58.107	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
3112d731-9aa2-4a70-83c6-90496fc1b6f2	0ad2d04a-0d38-4873-9277-d6933a89633b	32529885eb8dd4590766e0b595df9e8f79642672f02c8814fb6ff8a5a214f7ba	2026-05-11 00:33:22.979	2026-05-04 00:33:22.98	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
25e52e0e-5b95-4515-b319-4bfa131c4389	0ad2d04a-0d38-4873-9277-d6933a89633b	c213fdbcf142c3a55e27a6349b91639b5762865f7f758b53bba5b1ed691bbce3	2026-05-11 19:46:24.093	2026-05-04 19:46:24.094	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
2c862512-036e-4240-b513-52aca47fb708	0ad2d04a-0d38-4873-9277-d6933a89633b	4087b473730ceae477708a76667e913f76e6694d487bcd685d3de1dfb9beccff	2026-05-11 19:46:35.41	2026-05-04 19:46:35.411	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
37d6f7b7-129e-4f06-be12-983bb7477ec7	0ad2d04a-0d38-4873-9277-d6933a89633b	8986867cb8b3bc38de1197c2218f82b8a49853ad3915b06ea990d9d0f26cbe38	2026-05-11 20:44:09.819	2026-05-04 20:44:09.82	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
e6e77893-51aa-4cb0-acd5-cca7d024177b	c261e4fc-9ffa-497f-b498-24ff2b6a7370	db5349b85b31f6ba912040cd62bbf0d8a2df255ba76d1edd0d1ad8b82cd675f6	2026-05-12 02:14:13.742	2026-05-05 02:14:13.743	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
db9698bf-8a4a-4650-8e0a-395947e6448b	0ad2d04a-0d38-4873-9277-d6933a89633b	9561083dbc1d8321ff2403545fbb80914d155715c8fac329ecaf0dcc7e16c40c	2026-05-12 02:17:30.548	2026-05-05 02:17:30.549	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.users (id, name, email, password_hash, role, is_verified, is_2fa_enabled, last_login, created_at, updated_at, avatar_url, google_id, provider) FROM stdin;
c261e4fc-9ffa-497f-b498-24ff2b6a7370	law	syedasadabbas.1815@gmail.com	$2b$10$SBBlpQN5g3q9UiB.shrr8Oa6imTkrMknSWhMJHts3XsAIdzp8s62m	ADMIN	t	f	2026-05-05 02:14:13.721	2026-04-09 07:35:15.824	2026-05-05 02:14:13.723	https://lh3.googleusercontent.com/a/ACg8ocJZYr6EJ0Ph1ofOs9gVliZbpVvgdx9mU0UW-70E8azJBeI6W84=s96-c	102561297748633880075	local+google
0ad2d04a-0d38-4873-9277-d6933a89633b	asad	lawlite2005@gmail.com	$2b$10$Y4KrF6RrUNDFQYZeL7gPuO0mnIgmy90ZsrawqUO.Sizj2vkGtrHje	ADMIN	t	f	2026-05-05 02:17:30.545	2026-04-08 18:03:09.645	2026-05-05 02:17:30.546	https://lh3.googleusercontent.com/a/ACg8ocIQlBZBKY3QVR00STLS2_AipVwHAs84yv0lQG0y9FQ3ZaS6CPaD=s96-c	112530291472027987288	local+google
4335e9b2-e48c-49c3-9e17-b033d6acfd02	testuser1	TU1@gmail.com	$2b$10$..Q5V4VDhk.xyw7Qwb/M3ea7.rfhzmORosFy0wfiCUQ/rvcq1D9RG	USER	f	f	2026-04-09 14:27:25.616	2026-04-09 14:27:23.213	2026-04-09 14:27:25.617	\N	\N	local
\.


--
-- Data for Name: malicious_ip_observations; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.malicious_ip_observations (id, scan_id, ip_address, geo_lat, geo_long, country, "timestamp") FROM stdin;
5d8920cb-d481-463d-91e2-732bc13a8b2b	c8e678ca-c2b9-4122-96fa-20cdc0d9aa86	52.74.6.109	1.28009	103.851	Singapore	2026-04-08 18:04:11.742
10725ba7-47f9-4eb2-af2b-c80f37dbaab7	85ee8356-540d-432b-bb05-4743cf67cb2b	52.74.6.109	1.28009	103.851	Singapore	2026-04-08 18:05:15.463
653b208e-8745-4f63-99f9-f5bc5e1e926c	58f1f96a-db8c-4763-afa4-92a0d8688d19	14.139.251.148	25.7087	81.0867	India	2026-04-08 18:34:28.291
31be755f-bea7-46ac-ab01-ce38cbf3d37d	35ce566d-beff-4dc6-ad0f-607d26fdaad7	13.215.239.219	1.28009	103.851	Singapore	2026-04-09 07:10:12.7
d625f298-2e07-4af8-9224-bced4c9f18d8	3d7434db-0b64-4ace-9ed3-bed4acfa2c80	13.215.239.219	1.28009	103.851	Singapore	2026-04-09 14:28:50.542
a26b30a2-066c-44aa-8b7a-c1f210f6025f	1a3e9fab-58ef-4799-84ae-ec6ced008668	188.114.97.6	43.6532	-79.3832	Canada	2026-04-09 14:32:29.087
0f0f751e-cbb4-47b5-8bca-f0a9da0e7c94	a7869702-7a5d-4d27-ae0f-d6da0b643950	104.21.41.102	43.6532	-79.3832	Canada	2026-04-09 14:57:39.53
1a23659e-133b-4ce3-8b80-1ef3f3d3d325	051eb152-f2df-4856-a851-bfcdc694c932	104.21.41.102	43.6532	-79.3832	Canada	2026-04-09 14:58:55.785
f759e4fa-a730-4614-a1b4-c02f980931d5	aba47ec9-47f9-4035-a815-a2c5abd61da7	188.114.96.6	43.6532	-79.3832	Canada	2026-04-09 16:21:15.213
29d66898-74dc-4ab6-a0ce-f15e5f413144	f0cf3016-92af-4f8c-b81e-360906841b28	111.68.99.6	33.7233	73.0435	Pakistan	2026-04-24 17:00:48.546
f46feda3-4458-4007-9f3e-55ef7e9bb2a8	ea41fb41-b781-4a2e-8939-0a2966eb3005	111.68.99.6	33.7233	73.0435	Pakistan	2026-04-24 17:29:17.145
0400e375-426f-49c8-88f0-615e6e6d631b	963fc0a9-ad92-424d-802d-964a4e559f15	13.223.25.84	39.0438	-77.4874	United States	2026-04-25 20:25:22.982
4c525ee8-ad11-4ff8-ba7a-7d909d3d6fcc	37dfdbcc-0f56-4ba5-8159-e097ebc81f39	142.250.187.78	37.4225	-122.085	United States	2026-04-25 20:32:56.932
ac249b2e-ca58-4b63-9398-57ebceb16652	b52fd573-63e2-48c7-95e2-b5741f2a2934	142.250.187.78	37.4225	-122.085	United States	2026-04-25 20:34:00.919
4106f8bb-7952-48ba-98fc-920f7d656d25	297cb789-e928-4ec5-9542-3a1c0466f63e	104.21.41.102	43.6532	-79.3832	Canada	2026-05-03 23:46:45.614
\.


--
-- Data for Name: queued_jobs; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.queued_jobs (id, job_type, payload, status, created_at, updated_at) FROM stdin;
a0b7a676-0eb0-4089-a590-02ba39c8cec9	send_forgot_pass_otp_email	"{\\"email\\":\\"syedasadabbas.1815@gmail.com\\",\\"code\\":\\"444702\\",\\"subject\\":\\"Reset your password\\"}"	FAILED	2026-04-28 09:02:52.168	2026-04-28 09:03:00.157
031191d7-dcaa-4dc6-b81f-ccbe54a2a9e2	send_forgot_pass_otp_email	"{\\"email\\":\\"syedasadabbas.1815@gmail.com\\",\\"code\\":\\"155865\\",\\"subject\\":\\"Reset your password\\"}"	FAILED	2026-04-28 11:28:31.742	2026-04-28 11:29:00.136
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.reviews (id, user_id, rating, comment, status, created_at) FROM stdin;
a0168ad8-4df2-40a7-af46-3d77ecc38118	c261e4fc-9ffa-497f-b498-24ff2b6a7370	5	it is wonderful	APPROVED	2026-04-09 07:36:06.778
728f3162-8750-458a-8666-4d7c55b4bc06	c261e4fc-9ffa-497f-b498-24ff2b6a7370	5	it works like charm	APPROVED	2026-04-09 16:22:06.494
84517f99-cb4c-426d-8f92-eb9a517cd7eb	0ad2d04a-0d38-4873-9277-d6933a89633b	5	This is a Good Product 	APPROVED	2026-04-28 09:14:50.468
610a19b2-35f8-4e62-9a53-61fcc154aeb5	c261e4fc-9ffa-497f-b498-24ff2b6a7370	5	There Products works like a charm !	APPROVED	2026-05-04 00:32:54.333
\.


--
-- Data for Name: scan_explanations; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scan_explanations (id, scan_result_id, llm_text) FROM stdin;
f151aed1-2f5d-409b-a327-f0fe5db6b543	592b0e3b-d32e-4fdd-8f47-221d0359dc53	explanation currently unavailable due to technical connection.
23fdc0c1-a3ed-4a1d-8b38-661787172a5c	f08168e2-2804-4275-9014-4be7ce19bcff	explanation currently unavailable due to technical connection.
10fd85d9-1dff-4628-b508-3b0a4250b4ad	dc54cded-173f-42cc-9739-c43b7a5c7e84	explanation currently unavailable due to technical connection.
d88f5191-4542-4aa7-893f-32212156cbe8	e63a8f44-16c0-41d2-93ec-907d4ef15953	explanation currently unavailable due to technical connection.
57f7c3a4-144a-4a2b-b3bb-4e9bd276d211	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	explanation currently unavailable due to technical connection.
dc000a8f-564f-4805-8fff-331975f6b48d	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	explanation currently unavailable due to technical connection.
1d7a240c-628a-455a-a2bf-fe1c21016851	64d5fbcf-b705-46ff-a875-b6b033625990	explanation currently unavailable due to technical connection.
bbcbeaef-a7f9-4e83-812a-638be95eea76	eed29f06-16d4-4bbe-915a-185c19573c0d	explanation currently unavailable due to technical connection.
8863f7ff-5345-4752-a48e-88e6207b6116	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	explanation currently unavailable due to technical connection.
adedd493-043a-4aac-9856-ad7dd6f0df3b	4645ba29-63e8-48eb-a1ff-2aaead17221c	explanation currently unavailable due to technical connection.
83265005-dfa2-4bb6-b6d1-10ebb96f1ba9	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	explanation currently unavailable due to technical connection.
a88de232-8cf4-4d27-ad17-5ca35eae610c	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	explanation currently unavailable due to technical connection.
7c72184f-14f6-4b07-9c0b-386b38e6e3ce	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	explanation currently unavailable due to technical connection.
8b65f023-6c1f-4524-8178-2b52e764ebfc	37f96692-b399-4c3f-8d5e-8689aca06976	explanation currently unavailable due to technical connection.
0ab89a63-ddd8-4bb1-8061-1a1a7fc34756	35aacc94-becc-4793-bca3-97edc618b3d6	explanation currently unavailable due to technical connection.
dde7b4e0-55af-4d8d-a608-dc911f338e36	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	explanation currently unavailable due to technical connection.
b47b92a2-0cdb-4cdb-9b57-67963ea6b1a4	d3b406d4-02b7-407b-8391-23c9154a3793	explanation currently unavailable due to technical connection.
6bde601f-6d7b-4904-a75f-595f7a1507de	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	explanation currently unavailable due to technical connection.
413596b4-cda0-47d9-a152-56d684839de2	48fc719b-d625-46a9-8033-c55061f758f1	explanation currently unavailable due to technical connection.
528344ae-aca6-4cb1-b507-df324d7b0cc6	899ce20e-90d3-48f6-8969-c94d134526d0	explanation currently unavailable due to technical connection.
ea4e9450-edb3-4518-bc09-390378029697	16588a9a-a08d-4ea6-a355-733a5af00ce4	explanation currently unavailable due to technical connection.
061ad98c-271d-4b82-aaf1-37f7e9f58ad5	759ed6b6-5d3f-45b7-a849-cb35940d4f84	explanation currently unavailable due to technical connection.
b87cda27-4a9a-4bc0-b25b-56186bbf3cf3	e4526726-d01c-4c06-b7dc-bd3952dc868c	explanation currently unavailable due to technical connection.
d53321e3-94c2-4063-a7a6-43e74a8b2972	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	explanation currently unavailable due to technical connection.
3feb9cf6-1c03-4767-93b0-5856b0cbbed5	e251d3c5-0422-4362-a170-201d329c6ba9	explanation currently unavailable due to technical connection.
5aad1dae-7891-4315-ac55-c0f9bf133e36	bebedffc-547d-4533-bcae-7ec61125253e	explanation currently unavailable due to technical connection.
e408e9aa-69a9-4f9d-a4c8-b4642c0378da	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	explanation currently unavailable due to technical connection.
a4cc8edf-c006-47e2-978c-a1e0087adfc5	97850437-4ba9-42a6-830c-8d5f30c8fa79	explanation currently unavailable due to technical connection.
826ca174-6966-4cd8-a2ab-065ece4931d2	950c31d1-3924-496a-9165-9c1812261f8b	The prediction is PHISHING, primarily driven by strong signals from the URL modality. Specifically, the feature 'NoOfSubDomain' had the highest SHAP value of 3.4044 among URL features, indicating that the number of subdomains present strongly contributed to the phishing determination. The overall confidence in this decision is 100.0%, despite conflicting signals from the DOM and Visual models, which scored 0.000.
72f99a3d-d7c8-4cc5-b12d-a73359642a4e	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	The final decision is BENIGN, primarily driven by the URL modality. The URLLength feature was the most significant factor contributing to the benign URL score, with a SHAP value of -2.2632. The overall confidence in this decision is 100.0%, despite the visual model score of 0.967 strongly indicating phishing.
4e5318da-cc8b-4276-925f-91103ef13c3b	de84e960-90b3-401c-afe2-208610d97082	The prediction is PHISHING, primarily driven by the URL model. The URL feature with the highest positive contribution is URLLength (6.324), indicating that a longer URL strongly contributed to the phishing detection. The overall confidence is 100.0%, with the DOM model providing a conflicting signal against phishing.
f2b84bbc-8c7e-4b76-a9c6-768eb2fbd04c	05ea93c9-c62b-4aa3-8927-1fe044873807	The detection decision is PHISHING, primarily driven by the URL model. Specifically, DomainLength, with the highest positive SHAP value, strongly contributed to the URL model's score, indicating that a longer domain was a significant phishing indicator. The overall confidence is 100.0%, despite the DOM model indicating a low likelihood of phishing.
cdf8ec71-8341-473c-ab21-8962864655b2	3fc325da-891f-4b79-9590-d28967b1bb1a	The final decision is BENIGN, primarily driven by the URL modality. Within the URL analysis, the URLLength feature had the most significant impact, indicating the URL's length contributed to the benign prediction. The overall confidence is 100.0%, despite the Visual model score showing a conflicting signal at 0.502.
b87796a4-b3c3-4d65-a8d9-cb4fbadab417	af59e363-88ab-4976-a868-5d59c5ce6b5f	The site is classified as phishing, primarily driven by strong signals from the URL analysis. Specifically, the high number of subdomains in the URL was the strongest indicator, meaning the URL contained an unusual quantity of sub-sections before the main domain. The overall confidence in this decision is 100.0%, despite the visual model providing a weaker phishing signal compared to the URL and DOM analyses.
0510eea9-1bab-43b4-9976-b2c8ab499e03	74e9a624-df2f-481b-9358-57a7af5a7577	explanation currently unavailable due to technical connection.
ac906362-bd48-4869-996a-dbf990890996	446d8195-4833-4bff-8619-482b585e9157	explanation currently unavailable due to technical connection.
a434bf67-265f-46e4-9fd5-51c1d07b66e1	2c80758a-0e51-41f5-a1a9-f96693c31401	The prediction is BENIGN, primarily driven by the URL modality. Within the URL analysis, URLLength had the highest SHAP value of -2.2116, indicating it was the strongest factor contributing to the URL model's benign prediction. The overall confidence for this decision is 100.0%, despite the Visual model score of 0.502 indicating a conflicting signal.
6436944b-1cec-42fe-9b3e-ff8b086aed6e	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	The final decision is BENIGN, primarily driven by the URL modality. The URL feature with the highest SHAP value was URLLength, indicating it was the most significant factor pushing the URL towards a benign classification. The overall confidence in this decision is 100.0%, despite the Visual model scoring 0.967, which indicates a strong phishing signal.
eaf573f5-6dcb-4a5c-8776-b9dc6f1d683b	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	The final decision is BENIGN, primarily driven by the URL modality due to its strong contribution to this classification. Within the URL model, the URLLength feature had the highest SHAP value of -2.2632, indicating it was the strongest factor contributing to the URL's benign classification. The overall confidence in this BENIGN decision is 100.0%, despite a strong conflicting signal from the Visual model score of 0.983, which indicated phishing.
4ab79a36-c692-405b-a18a-737d6564e656	3f3410de-07d6-44b1-88c8-f3e6261f863e	explanation currently unavailable due to technical connection.
27a24f2e-eebe-435c-9a37-a2b98033b4ca	36d6fef1-5101-48da-8503-787bff1a8180	explanation currently unavailable due to technical connection.
dabbff40-3f3e-457c-8bda-73750a37a4ff	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	explanation currently unavailable due to technical connection.
0ef6b3f6-b587-42ab-95c0-de002646928b	341e350e-25e3-4f99-9105-36c6766c4ab9	✅ **Verified Safe:** This website is safe because its domain is verified in the Top 1 Million Whitelist.\n\nexplanation currently unavailable due to technical connection.
0bffa853-9ce6-4bb0-b091-8c42ff134793	6f9d55db-607e-42f1-8d81-40324d1d02b9	✅ **Verified Safe:** This website is safe because its domain is verified in the Top 1 Million Whitelist.\n\nexplanation currently unavailable due to technical connection.
5d464b54-1fae-4c35-bbf5-28dfbf2eeffb	7e62a949-c05a-4b12-bbcc-c80379700ff2	The final decision is BENIGN, primarily driven by the DOM model, which had a fusion-level evidence value of -0.0876. Specifically, within the URL analysis, a high URLLength with a SHAP value of 6.1757 contributed most significantly to the URL model's strong phishing signal. Despite this, the overall confidence for the BENIGN decision is 100.0%, even with strong phishing signals from the URL model score of 1.000 and visual model score of 0.959.
5d6c23a3-4c01-4594-8a6c-b9ac7920deac	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	Note: Gemini API Key not found. Please set GEMINI_API_KEY environment variable for detailed explanations.
bed8cdbe-5f1d-4650-aed9-d2760154aca0	9d38efe7-4d9b-4adb-9845-a94914d84946	Note: Gemini API Key not found. Please set GEMINI_API_KEY environment variable for detailed explanations.
7a0d9477-3024-4966-a2ba-28ec07d4d42f	2f167f9d-6c13-49da-bee9-b929b63b7969	Note: Gemini API Key not found. Please set GEMINI_API_KEY environment variable for detailed explanations.
991f7990-0e91-40ff-8b10-37a7b9cbcd8c	61a10b3a-5792-4e91-bf33-a62dd709ccd7	Note: Gemini API Key not found. Please set GEMINI_API_KEY environment variable for detailed explanations.
aa8d7d21-a450-48d6-aff5-c1ae4383e68d	5b2fdea7-0950-4499-b634-164a0e28fa7b	explanation currently unavailable due to technical connection.
d4b2129c-9bf6-426e-a593-d59da9cb5b58	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	The final decision is BENIGN, primarily driven by evidence from the URL modality. Within the URL modality, the URLLength feature, with a SHAP value of -2.2632, contributed most significantly to the benign URL score, indicating its length was characteristic of benign URLs. The overall confidence in this decision is 100.0%, although the Visual model score of 0.983 presented a strong phishing signal, contrasting with the very low URL and DOM model scores.
42456944-b231-4752-957e-42e0436c5da9	f4c5a196-282a-4278-818e-7ae4da996b8f	This website has been determined to be harmless, even though some aspects initially looked suspicious. While strong visual signals suggested it might be a harmful site, a closer inspection of its web address and underlying content found no actual problems. Our system is completely confident that this site is safe for you to use.
9395c093-37b1-49e8-8bf0-3eb73afbcf8e	bf7eafb7-0606-4d92-b9c4-cf4244320281	This website was ultimately determined to be safe, or "benign," after a full review.\nWhile our initial checks flagged some visual elements as potentially unusual, a deeper look showed these were harmless, and its web address only had minor, non-threatening quirks.\nWe are completely confident this site poses no risk to you.
02e29fcd-673f-41b4-8a7e-b279a32f1d00	da914dc9-f196-4a54-8e88-244f03c895c8	This site has been flagged as phishing primarily because its web address looks very suspicious. Specifically, the web address contained too many numbers, unusually long number sequences, and an odd overall length, while the page's hidden structure also looked suspicious. We are absolutely certain this site is a scam, so please avoid it.
58b9a4d6-f25c-4feb-9111-9321f01988ff	07dff763-a952-438f-88e8-eec865052bf1	This website has been deemed safe to visit, primarily because its overall appearance was not found to be misleading or trying to trick you. Although some parts of its web address seemed unusual, such as having many sections or an odd length, and its underlying code showed some irregularities, the visual design itself passed our safety checks. Our system is highly confident in this assessment, indicating that this site poses no threat.
253cedfc-16d8-4fa7-aff8-fa96d0437ec2	3b428085-df67-4c58-bcfb-3d88d4456462	This website has been flagged as benign, meaning it appears to be safe for you to visit.\nWe did observe a few minor unusual characteristics in its web address, like its length or number of sections, and a small concern with how the page is put together, but these issues were not significant enough to be worrisome.\nWe are very confident (99.8%) in this assessment, so you can proceed without high concern.
2a7a8592-f67d-40ca-8dd6-3af1cb1d981e	133fcf48-7348-409e-a23b-8e15535dc2a8	explanation currently unavailable due to technical connection.
006b8787-50f3-4a62-9879-fb5f4880cc7b	c07abecc-875e-44e4-84b0-73b3e2d9d04e	explanation currently unavailable due to technical connection.
7baa2a50-005f-47de-9c41-cdc91881e58a	df336d21-4f4f-4489-9027-1c30aeb7d317	This website was flagged as benign because our system didn't find strong evidence of a threat. While some minor details in its web address and internal structure raised small flags, its visual appearance showed no signs of being harmful. Our system is fully confident that this site is safe to visit.
2e30b716-9657-4034-b2a7-eeb664b2bca6	1990dc06-ac23-490b-bac5-37f692d02bb1	This website has been flagged as safe because our analysis found no genuine threats. While we did notice some minor unusual elements in the page's structure and a few oddities in its web address, these were not strong indicators of danger. We are highly confident (84.3%) that this site is harmless and safe for you to use.
\.


--
-- Data for Name: scan_results; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scan_results (id, scan_id, prediction, confidence_score, phishing_probability) FROM stdin;
592b0e3b-d32e-4fdd-8f47-221d0359dc53	c8e678ca-c2b9-4122-96fa-20cdc0d9aa86	PHISHING	0.7787138354097465	0.7787138354097465
f08168e2-2804-4275-9014-4be7ce19bcff	85ee8356-540d-432b-bb05-4743cf67cb2b	PHISHING	0.7787138354097465	0.7787138354097465
dc54cded-173f-42cc-9739-c43b7a5c7e84	c073fb5f-2ca0-4e3c-90b1-b82359efe4d7	BENIGN	0.9642461398879686	0.03575386011203145
e63a8f44-16c0-41d2-93ec-907d4ef15953	9d0cc67d-1daf-4748-bd92-3a1e8ca6130e	BENIGN	0.9642461398879686	0.03575386011203145
e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	81c8ec04-bbf3-42d7-986f-7e993b0ff8b9	BENIGN	0.996909494980201	0.003090505019799029
5caf550d-8c6a-4dc1-a89b-4a7c878a25be	e950d6c6-62cc-40ba-80db-e43380d9f9b0	BENIGN	0.9919918871549693	0.00800811284503067
64d5fbcf-b705-46ff-a875-b6b033625990	1d34fd21-5a97-4b4b-a350-0b0ce7b993b8	BENIGN	0.9999745911055125	2.540889448754007e-05
eed29f06-16d4-4bbe-915a-185c19573c0d	58f1f96a-db8c-4763-afa4-92a0d8688d19	PHISHING	0.709879708109178	0.709879708109178
56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	734fadf6-f39d-49f9-bba0-1de8abd2a10a	BENIGN	0.9996763165767908	0.000323683423209208
4645ba29-63e8-48eb-a1ff-2aaead17221c	f4c662e2-e3b2-436d-8aa4-3ed9841abe3c	BENIGN	0.9999745911055121	2.540889448792109e-05
9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	3f3d1dd5-59df-42be-a646-2cde64adc006	BENIGN	0.999974591105489	2.540889451097267e-05
7bc9ad7a-43aa-46f3-99bd-3411f3d67244	44b54234-089c-4dd7-b52e-4e9003e1103e	PHISHING	0.7787138354097465	0.7787138354097465
8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	b0fe5c4b-69da-46bb-8726-3e3a69538be2	PHISHING	0.7787138354097465	0.7787138354097465
37f96692-b399-4c3f-8d5e-8689aca06976	40ed5f7a-7a67-4f92-9774-143172eb5229	PHISHING	0.7787138354097465	0.7787138354097465
35aacc94-becc-4793-bca3-97edc618b3d6	12954439-a666-40da-9417-ce8468ad124b	PHISHING	0.7787138354097465	0.7787138354097465
1fa73189-8af2-49fc-9768-ac6a04ac1c3e	265cd77b-5a09-49f5-a3de-27663fa783b8	PHISHING	0.7787138354097465	0.7787138354097465
d3b406d4-02b7-407b-8391-23c9154a3793	271a767a-9fab-4e7c-b55b-13caf624f536	PHISHING	0.7787138354097465	0.7787138354097465
3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	355e3cf9-65bd-49d7-856d-e980a406e289	BENIGN	0.98880095483299	0.01119904516701001
48fc719b-d625-46a9-8033-c55061f758f1	35ce566d-beff-4dc6-ad0f-607d26fdaad7	PHISHING	0.9999808347958846	0.9999808347958846
899ce20e-90d3-48f6-8969-c94d134526d0	3d7434db-0b64-4ace-9ed3-bed4acfa2c80	PHISHING	0.7787138354097465	0.7787138354097465
16588a9a-a08d-4ea6-a355-733a5af00ce4	f303439e-3f10-4c84-b0ee-1d0fa3c8e0b9	BENIGN	0.9999745931993287	2.540680067128777e-05
759ed6b6-5d3f-45b7-a849-cb35940d4f84	1a3e9fab-58ef-4799-84ae-ec6ced008668	PHISHING	0.9999506754597295	0.9999506754597295
e4526726-d01c-4c06-b7dc-bd3952dc868c	4d689ccb-69f4-4df4-aa14-0f5449c8a899	BENIGN	0.9999745931993287	2.540680067128777e-05
fbfc5e19-941f-48d3-ad43-9ac2a6629a87	a7869702-7a5d-4d27-ae0f-d6da0b643950	PHISHING	0.9999506754597295	0.9999506754597295
e251d3c5-0422-4362-a170-201d329c6ba9	051eb152-f2df-4856-a851-bfcdc694c932	PHISHING	0.9999506754597295	0.9999506754597295
bebedffc-547d-4533-bcae-7ec61125253e	aba47ec9-47f9-4035-a815-a2c5abd61da7	PHISHING	0.9999702710227105	0.9999702710227105
b9d53fde-f90e-46ad-ac4f-a81cff830b5c	f0cf3016-92af-4f8c-b81e-360906841b28	PHISHING	0.9999745908278064	0.9999745908278064
97850437-4ba9-42a6-830c-8d5f30c8fa79	ea41fb41-b781-4a2e-8939-0a2966eb3005	PHISHING	0.9999745908266685	0.9999745908266685
950c31d1-3924-496a-9165-9c1812261f8b	963fc0a9-ad92-424d-802d-964a4e559f15	PHISHING	0.9999730014207308	0.9999730014207308
91709f0d-7a72-457f-a0b4-1b703ba4d1f6	bed454c8-22cd-4ce4-afef-151a37faca48	BENIGN	0.9998817136602529	0.000118286339747117
de84e960-90b3-401c-afe2-208610d97082	37dfdbcc-0f56-4ba5-8159-e097ebc81f39	PHISHING	0.9999690221171927	0.9999690221171927
05ea93c9-c62b-4aa3-8927-1fe044873807	b52fd573-63e2-48c7-95e2-b5741f2a2934	PHISHING	0.9999690221171927	0.9999690221171927
3fc325da-891f-4b79-9590-d28967b1bb1a	42942d5b-b43c-451c-a11c-b5f07695f2f4	BENIGN	0.9998817136602529	0.000118286339747117
af59e363-88ab-4976-a868-5d59c5ce6b5f	23f950bd-2063-4a1e-a387-bd0697be2512	PHISHING	0.9999681461050516	0.9999681461050516
74e9a624-df2f-481b-9358-57a7af5a7577	e139e291-cdcb-49bc-a16b-5b958965545d	BENIGN	0.9998817136602529	0.000118286339747117
446d8195-4833-4bff-8619-482b585e9157	f81094ba-b498-4f08-bbb3-cc873ce91b5f	BENIGN	0.9998817136602529	0.000118286339747117
2c80758a-0e51-41f5-a1a9-f96693c31401	f3cbfa89-ce37-453e-a759-12d503243d08	BENIGN	0.9998659341436728	0.0001340658563272384
112c96e9-5531-4fc4-9fa5-98a4f88a1c19	5c36879e-1e8b-425f-9041-8004332f0028	BENIGN	0.9998817136602529	0.000118286339747117
65d06fc9-35d3-4c83-baa0-0aa5f02139b1	814da5b4-f3d7-45b9-b060-b899ea3406f9	BENIGN	0.9998817136602529	0.000118286339747117
3f3410de-07d6-44b1-88c8-f3e6261f863e	cdccfe92-b5c0-46c8-b1ac-45c8c7e70880	BENIGN	0.9997679229745831	0.0002320770254169324
36d6fef1-5101-48da-8503-787bff1a8180	40aa6bce-4d5b-4064-866a-dc5fc9f8f8fa	BENIGN	0.7	0.3
8087cdcf-8f63-4a27-b3cd-ecb8facea02c	7e82c38d-e7f2-4b92-a3b9-06657db16578	BENIGN	0.8305874317884445	0.1694125682115555
341e350e-25e3-4f99-9105-36c6766c4ab9	86574963-f26b-4188-9fed-e31194a3313e	BENIGN	1	0
6f9d55db-607e-42f1-8d81-40324d1d02b9	c2884a12-90b0-4301-a66c-ac44d2a46166	BENIGN	1	0
7e62a949-c05a-4b12-bbcc-c80379700ff2	e3f2f417-bfd3-4774-8fcb-02be92501c1f	BENIGN	1	0
7541f7a3-d57f-4aeb-8065-1d81a9dd891f	db444174-6283-4e57-b828-8b22d3ae2240	BENIGN	1	0
9d38efe7-4d9b-4adb-9845-a94914d84946	646e46c3-95cd-4872-9338-e82e99a762fa	BENIGN	1	0
2f167f9d-6c13-49da-bee9-b929b63b7969	eb1a302e-bb18-4a78-9abf-baac5c7857ec	BENIGN	1	0
61a10b3a-5792-4e91-bf33-a62dd709ccd7	0c24c0fb-2fe0-4637-b3cf-b4e4574558ca	BENIGN	1	0
5b2fdea7-0950-4499-b634-164a0e28fa7b	a3c891c1-8d64-4370-9ee3-83dfc864db5c	BENIGN	1	0
9ebcaeb7-66e3-41aa-9fae-8d97c119a648	a8a4e0c6-5eaa-4e9c-a802-b70374e021b9	BENIGN	1	0
f4c5a196-282a-4278-818e-7ae4da996b8f	c91976f1-f2dd-4a47-b509-ab8c642bb403	BENIGN	1	0
bf7eafb7-0606-4d92-b9c4-cf4244320281	4882e423-9c4f-4c23-b8f2-f624f975c1a3	BENIGN	1	0
da914dc9-f196-4a54-8e88-244f03c895c8	297cb789-e928-4ec5-9542-3a1c0466f63e	PHISHING	0.9999744574877074	0.9999744574877074
07dff763-a952-438f-88e8-eec865052bf1	581ca008-06ea-41f5-8bb7-5eea5a20af3e	BENIGN	0.9613913496923067	0.03860865030769329
3b428085-df67-4c58-bcfb-3d88d4456462	b28820a9-f999-4c1f-9999-f8c1785ed30a	BENIGN	0.9980799459057464	0.001920054094253518
133fcf48-7348-409e-a23b-8e15535dc2a8	d7631a71-b418-4297-bcb2-2e1318a4622e	BENIGN	0.7	0.3
c07abecc-875e-44e4-84b0-73b3e2d9d04e	5506cdbd-d1b6-404e-ad4e-d4874068e4f2	BENIGN	0.7	0.3
df336d21-4f4f-4489-9027-1c30aeb7d317	87e4fbd2-7e28-44d9-bf87-031cec77786c	BENIGN	1	0
1990dc06-ac23-490b-bac5-37f692d02bb1	8838dfd7-e5a2-424e-9eb1-03e32b30909e	BENIGN	0.8426554981645749	0.1573445018354251
\.


--
-- Data for Name: scan_screenshots; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scan_screenshots (id, scan_result_id, image_url, base64_data) FROM stdin;
28b39526-8f57-495b-9564-249f2cac38f9	dc54cded-173f-42cc-9739-c43b7a5c7e84	http://localhost:5001/screenshots/screenshot_1775672497247.png	\N
34923841-de44-4ce1-90f3-7080eca42ea9	e63a8f44-16c0-41d2-93ec-907d4ef15953	http://localhost:5001/screenshots/screenshot_1775672569464.png	\N
76f72c09-c7d6-4668-ac52-2418e257755d	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	http://localhost:5001/screenshots/screenshot_1775672588642.png	\N
e9b33738-f648-4471-9ea5-e9001547e4f5	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	http://localhost:5001/screenshots/screenshot_1775672641300.png	\N
f975f526-a21c-4aa2-b3d2-7f506b288539	64d5fbcf-b705-46ff-a875-b6b033625990	http://localhost:5001/screenshots/screenshot_1775672682470.png	\N
ec99881c-8691-46dd-98d8-0c3f4fba6a0b	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	http://localhost:5001/screenshots/screenshot_1775673297346.png	\N
2d24984b-4685-4bcd-9e2c-49a89a648062	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	http://localhost:5001/screenshots/screenshot_1775674036900.png	\N
4b36eafe-9219-4fe1-9a19-f855b6d1cf69	48fc719b-d625-46a9-8033-c55061f758f1	http://localhost:5001/screenshots/screenshot_1775718605731.png	\N
5c6c6485-5503-408c-b0e0-aa78ec236c5b	16588a9a-a08d-4ea6-a355-733a5af00ce4	http://localhost:5001/screenshots/screenshot_1775745125641.png	\N
ef767c8f-2e56-4f6f-a159-a2cceb997274	759ed6b6-5d3f-45b7-a849-cb35940d4f84	http://localhost:5001/screenshots/screenshot_1775745143619.png	\N
05ff25c4-3c74-44e1-a379-916fb6af3565	e4526726-d01c-4c06-b7dc-bd3952dc868c	http://localhost:5001/screenshots/screenshot_1775746625521.png	\N
432da724-6aa4-43cf-9d55-26f2cee2e504	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	http://localhost:5001/screenshots/screenshot_1775746653782.png	\N
39d1ee09-519c-4989-892f-219b49697986	e251d3c5-0422-4362-a170-201d329c6ba9	http://localhost:5001/screenshots/screenshot_1775746729699.png	\N
cd03f207-a544-46da-9883-791e6c2e466a	bebedffc-547d-4533-bcae-7ec61125253e	http://localhost:5001/screenshots/screenshot_1775751669056.png	\N
d0e93782-8b47-4602-82f6-358e16e5e670	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	http://localhost:5001/screenshots/screenshot_1777050040980.png	\N
63cd6d86-cdd2-4f2e-9e00-7bc5edf584a4	97850437-4ba9-42a6-830c-8d5f30c8fa79	http://localhost:5001/screenshots/screenshot_1777051750487.png	\N
44ea1b6d-1d17-4a4c-b63a-3631d2ed08cc	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	http://localhost:5001/screenshots/screenshot_1777149050474.png	\N
e27570e5-347c-4779-8261-a70890cf82e4	de84e960-90b3-401c-afe2-208610d97082	http://localhost:5001/screenshots/screenshot_1777149165803.png	\N
9f984b24-5817-4b85-8fa4-e8d789989a6b	05ea93c9-c62b-4aa3-8927-1fe044873807	http://localhost:5001/screenshots/screenshot_1777149228268.png	\N
606fb6cf-efc1-4f62-9d92-f93ebee1a47c	3fc325da-891f-4b79-9590-d28967b1bb1a	http://localhost:5001/screenshots/screenshot_1777149265491.png	\N
a014e707-e36f-499c-8ce6-7c94da464ea5	af59e363-88ab-4976-a868-5d59c5ce6b5f	http://localhost:5001/screenshots/screenshot_1777149445576.png	\N
a975f9de-7612-401a-adac-23229d58f7fb	74e9a624-df2f-481b-9358-57a7af5a7577	http://localhost:5001/screenshots/screenshot_1777367164681.png	\N
4037f9b8-de9c-47ef-bcab-5300e9a47196	446d8195-4833-4bff-8619-482b585e9157	http://localhost:5001/screenshots/screenshot_1777367484386.png	\N
9a073ae5-ca4b-4fc0-b414-bfe0faf71460	2c80758a-0e51-41f5-a1a9-f96693c31401	http://localhost:5001/screenshots/screenshot_1777375899082.png	\N
0f7bfdc0-f1db-4d54-9259-e5f7875d83ee	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	http://localhost:5001/screenshots/screenshot_1777375968504.png	\N
77436173-7b2d-4b7b-93b4-819fddf86a02	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	http://localhost:5001/screenshots/screenshot_1777505105864.png	\N
daa5eea6-6a09-452f-b25b-ddf2306acb4b	3f3410de-07d6-44b1-88c8-f3e6261f863e	http://localhost:5001/screenshots/screenshot_1777668905796.png	\N
ec73b01a-4b88-4ef2-ab46-bdfad4d45d9d	36d6fef1-5101-48da-8503-787bff1a8180	http://localhost:5001/screenshots/screenshot_1777846222707.png	\N
c023d5dc-2236-4869-852c-9edb7255fe39	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	http://localhost:5001/screenshots/screenshot_1777846364562.png	\N
e4602201-4940-4659-9fb4-2e5e40c5940c	341e350e-25e3-4f99-9105-36c6766c4ab9	http://localhost:5001/screenshots/screenshot_1777846398307.png	\N
17c2cad6-de82-4cb8-97c4-f52d21016e70	6f9d55db-607e-42f1-8d81-40324d1d02b9	http://localhost:5001/screenshots/screenshot_1777846439821.png	\N
22a72083-6968-46e0-94c0-d02bb9c986da	7e62a949-c05a-4b12-bbcc-c80379700ff2	http://localhost:5001/screenshots/screenshot_1777846709341.png	\N
b4fd5b88-c36b-4165-90cc-322e4064c2ab	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	http://localhost:5001/screenshots/screenshot_1777848845265.png	\N
bbc622e6-757a-4eef-bd1f-680ade38dcb9	9d38efe7-4d9b-4adb-9845-a94914d84946	http://localhost:5001/screenshots/screenshot_1777849408499.png	\N
25bb8328-220e-4def-b003-7567d459be95	2f167f9d-6c13-49da-bee9-b929b63b7969	http://localhost:5001/screenshots/screenshot_1777849620444.png	\N
3b78afc3-14d0-4423-b570-762cde54290d	61a10b3a-5792-4e91-bf33-a62dd709ccd7	http://localhost:5001/screenshots/screenshot_1777849821923.png	\N
4f626981-cae2-4a61-8fb6-506bf1874903	5b2fdea7-0950-4499-b634-164a0e28fa7b	http://localhost:5001/screenshots/screenshot_1777850029500.png	\N
eb037804-ffa7-4471-956a-841b87e098ec	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	http://localhost:5001/screenshots/screenshot_1777850559257.png	\N
8a5a8ad9-7de8-45a0-80a0-a724f21bf0ef	f4c5a196-282a-4278-818e-7ae4da996b8f	http://localhost:5001/screenshots/screenshot_1777851851804.png	\N
d37f57a7-2720-4ca7-84ff-e06156d48019	bf7eafb7-0606-4d92-b9c4-cf4244320281	http://localhost:5001/screenshots/screenshot_1777851939022.png	\N
bee3f68c-feb6-4e38-8ce4-125a329c928e	da914dc9-f196-4a54-8e88-244f03c895c8	http://localhost:5001/screenshots/screenshot_1777851994728.png	\N
5f87095b-5f54-4bc0-90a6-a792575d55de	07dff763-a952-438f-88e8-eec865052bf1	http://localhost:5001/screenshots/screenshot_1777852065476.png	\N
114e3dcf-de53-4cd1-bd1d-5eabb52f9fdb	3b428085-df67-4c58-bcfb-3d88d4456462	http://localhost:5001/screenshots/screenshot_1777853576396.png	\N
ee059a89-da84-4e38-9b69-e1f8125d6962	133fcf48-7348-409e-a23b-8e15535dc2a8	http://localhost:5001/screenshots/screenshot_1777924061530.png	\N
ccd8cf9c-84c9-4d53-bbbe-da22012df7c3	c07abecc-875e-44e4-84b0-73b3e2d9d04e	http://localhost:5001/screenshots/screenshot_1777924138642.png	\N
41f2807d-36be-4e3c-9406-9adb5495f25a	df336d21-4f4f-4489-9027-1c30aeb7d317	http://localhost:5001/screenshots/screenshot_1777947302527.png	\N
8253a4f8-3dcb-468b-9728-5398f98dbbf7	1990dc06-ac23-490b-bac5-37f692d02bb1	http://localhost:5001/screenshots/screenshot_1777947365789.png	\N
\.


--
-- Data for Name: scan_shap_values; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scan_shap_values (id, scan_result_id, feature_name, shap_value, modality) FROM stdin;
49f99899-f089-4040-8dca-d685fb7ec0a7	592b0e3b-d32e-4fdd-8f47-221d0359dc53	dom	0.5116676185638194	fusion_contribution
1a756967-e4ab-46a5-b585-d4f39a31d995	592b0e3b-d32e-4fdd-8f47-221d0359dc53	url	0.4883323814361785	fusion_contribution
788cd4e4-365e-4c25-a08e-ca5d6f41dbb5	592b0e3b-d32e-4fdd-8f47-221d0359dc53	visual	2.191256731212287e-15	fusion_contribution
0245da72-2163-4755-a567-f8092703df6f	592b0e3b-d32e-4fdd-8f47-221d0359dc53	DomainLength	-3.182248157540323	url
a66b4693-3bdb-4110-9759-a93b55e60749	592b0e3b-d32e-4fdd-8f47-221d0359dc53	TLDLegitimateProb	-0.1697388236265437	url
ad95c885-2bf0-4953-9b30-352cfc246820	592b0e3b-d32e-4fdd-8f47-221d0359dc53	URLCharProb	0.6824690412296255	url
ef627842-c337-4f8c-8875-5550f57a0b69	592b0e3b-d32e-4fdd-8f47-221d0359dc53	URLLength	3.227316759552837	url
8cc54a10-47cd-451d-857c-b0d5d7b5311b	592b0e3b-d32e-4fdd-8f47-221d0359dc53	URLSimilarityIndex	9.022935373669675	url
6ef9611d-af46-48f1-854d-9656e48bf268	f08168e2-2804-4275-9014-4be7ce19bcff	dom	0.5116676185638194	fusion_contribution
78a82448-7181-4371-9743-30c0eb951671	f08168e2-2804-4275-9014-4be7ce19bcff	url	0.4883323814361785	fusion_contribution
584bd112-676c-4bac-84ab-691a4528c5ef	f08168e2-2804-4275-9014-4be7ce19bcff	visual	2.191256731212287e-15	fusion_contribution
ad6b3334-2716-4ca9-9a22-84e18223ae3b	f08168e2-2804-4275-9014-4be7ce19bcff	DomainLength	-3.182248157540323	url
4023ca05-ea9f-4534-b646-e716427854bb	f08168e2-2804-4275-9014-4be7ce19bcff	TLDLegitimateProb	-0.1697388236265437	url
fc6cc9dd-e1d3-4f92-87af-f1167087b9ac	f08168e2-2804-4275-9014-4be7ce19bcff	URLCharProb	0.6824690412296255	url
f7fdf881-06e6-48a8-8eb3-630e5fb7bf5b	f08168e2-2804-4275-9014-4be7ce19bcff	URLLength	3.227316759552837	url
0fba9278-6b4c-4f01-8b44-7a4febdefa8e	f08168e2-2804-4275-9014-4be7ce19bcff	URLSimilarityIndex	9.022935373669675	url
2dd0f6c4-e071-4631-9de8-5726f0e80b1d	dc54cded-173f-42cc-9739-c43b7a5c7e84	dom	0.1727645963376196	fusion_contribution
7b013c58-db6a-47cc-8b69-0964b1958f3e	dc54cded-173f-42cc-9739-c43b7a5c7e84	url	0.8272354036623766	fusion_contribution
fab14819-62c9-42c3-bcec-f624eabbd2d9	dc54cded-173f-42cc-9739-c43b7a5c7e84	visual	3.75797734639361e-15	fusion_contribution
b974c614-2c9f-4d4a-b74d-e52d0e1b29d8	dc54cded-173f-42cc-9739-c43b7a5c7e84	DomainLength	0.6209434545950631	url
955fdb0c-d336-4242-9a43-18d801baf7b3	dc54cded-173f-42cc-9739-c43b7a5c7e84	NoOfSubDomain	-10.19970980023665	url
4c5ae309-41f1-4749-89ae-6153a07e768f	dc54cded-173f-42cc-9739-c43b7a5c7e84	URLCharProb	0.5725763088041793	url
1e417959-12f6-4b2f-8402-4f65286ea4da	dc54cded-173f-42cc-9739-c43b7a5c7e84	URLLength	-1.268342382085257	url
7f9cab1f-8d5b-4194-bb76-3c08ae13cfac	dc54cded-173f-42cc-9739-c43b7a5c7e84	URLSimilarityIndex	6.861574336511729	url
8b64e792-2445-4890-ba9e-991f859eb414	e63a8f44-16c0-41d2-93ec-907d4ef15953	dom	0.1727645963376196	fusion_contribution
d1a3aed6-7df3-4f28-bebb-0727ed3007d1	e63a8f44-16c0-41d2-93ec-907d4ef15953	url	0.8272354036623766	fusion_contribution
0984d441-e2a7-4f98-b9a7-d03514da9e0b	e63a8f44-16c0-41d2-93ec-907d4ef15953	visual	3.75797734639361e-15	fusion_contribution
27845a9a-d157-47ab-9c1d-ac02085cd1a9	e63a8f44-16c0-41d2-93ec-907d4ef15953	DomainLength	0.6209434545950631	url
431a85e2-1a9c-449f-84fb-deb80f46993c	e63a8f44-16c0-41d2-93ec-907d4ef15953	NoOfSubDomain	-10.19970980023665	url
40ce491f-e44b-4fbe-b1bb-52696894e393	e63a8f44-16c0-41d2-93ec-907d4ef15953	URLCharProb	0.5725763088041793	url
9997687d-fd47-47a1-bdb6-919443afdedf	e63a8f44-16c0-41d2-93ec-907d4ef15953	URLLength	-1.268342382085257	url
2f2f5e1c-5003-4c86-9df0-13e41f36f809	e63a8f44-16c0-41d2-93ec-907d4ef15953	URLSimilarityIndex	6.861574336511729	url
eff93b19-c70a-40eb-bba6-edcaa629f0d3	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	dom	0.1344212681127646	fusion_contribution
9ba74f4b-0abd-4f5c-b835-6827f4e2057d	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	url	0.8655787318872302	fusion_contribution
5decc79c-c252-4387-8327-ba57649cdb89	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	visual	5.103675086303023e-15	fusion_contribution
9313eb28-dc6b-46f7-a3ea-fb38aff41dd7	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	DomainLength	0.4786836608814221	url
ba262231-74c2-4f60-8112-4b0bdaf02609	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	NoOfSubDomain	-10.72785396645654	url
2354f5f2-5e61-4109-ad8d-079d0159aee9	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	URLCharProb	0.7297671576649725	url
6afd2e02-c60c-42c1-89c0-f0e868db8e80	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	URLLength	-1.819173088936007	url
076b86d6-5ae2-488e-9c0e-cffb529052ac	e67a86ee-e1c1-4a1e-a4e4-83a7b98493c4	URLSimilarityIndex	6.624409844277709	url
c50317cc-511e-45ea-9590-2afb69be1542	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	dom	0.01013278298189496	fusion_contribution
f32dba5a-3b30-4b08-9a13-865696632a96	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	url	0.9898672170180993	fusion_contribution
bed89da8-836d-4b6a-9363-4209a68a470b	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	visual	5.738559971644089e-15	fusion_contribution
5a73d5c4-3d2c-4243-b930-db4aa0e38a28	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	NoOfSubDomain	-10.07544418707143	url
a9ea859e-e640-4e62-96d4-46c2751aba4c	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	TLDLegitimateProb	-0.770570529053521	url
208b5b66-7ed2-41f6-ac03-2199fdcdad4a	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	URLCharProb	0.5384823323201284	url
cf047baa-bd40-43c7-bae1-b30d470f318b	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	URLLength	-1.823864707703531	url
6c31248d-1fc4-4270-aa03-355029478efc	5caf550d-8c6a-4dc1-a89b-4a7c878a25be	URLSimilarityIndex	6.738131014388689	url
48d1ec67-2a5b-4d17-a20b-c5963cce657e	64d5fbcf-b705-46ff-a875-b6b033625990	dom	0.002436243431874746	fusion_contribution
8e0238c7-a8f9-4d41-854d-5b54d4636762	64d5fbcf-b705-46ff-a875-b6b033625990	url	0.9975637565681096	fusion_contribution
7dcf834d-b4d5-49b4-ab3b-2f377c4be54b	64d5fbcf-b705-46ff-a875-b6b033625990	visual	1.56558608788582e-14	fusion_contribution
6c0ffc99-4903-4264-b62d-cd8019b45ae7	64d5fbcf-b705-46ff-a875-b6b033625990	NoOfSubDomain	-5.346135332508054	url
3670e2f2-9cfc-46c1-b25c-f5763b4bf3c2	64d5fbcf-b705-46ff-a875-b6b033625990	TLDLegitimateProb	-0.1544751866644836	url
3786a7bd-6be2-4eb9-9827-f4b77650acac	64d5fbcf-b705-46ff-a875-b6b033625990	URLCharProb	0.6189911877047222	url
e9b296d4-8519-4fcd-979b-791899beef48	64d5fbcf-b705-46ff-a875-b6b033625990	URLLength	0.8286616353400826	url
bab8e164-b041-4269-a692-9f22767ece71	64d5fbcf-b705-46ff-a875-b6b033625990	URLSimilarityIndex	-10.33220085275659	url
07b53b86-48c3-4dbd-b2ec-110024e27d50	eed29f06-16d4-4bbe-915a-185c19573c0d	dom	0.5221607314090168	fusion_contribution
dfc17042-c3c7-43ed-b3c5-cdfaf516a7b3	eed29f06-16d4-4bbe-915a-185c19573c0d	url	0.4778392685909811	fusion_contribution
9fa7b1b1-3777-40d4-bee0-c733115b54f1	eed29f06-16d4-4bbe-915a-185c19573c0d	visual	2.191874073694056e-15	fusion_contribution
3b456f90-2ba4-4434-90b6-692b7e8338cb	eed29f06-16d4-4bbe-915a-185c19573c0d	DomainLength	0.7200832367420426	url
993a84b5-9647-49d5-9f22-6d1036039438	eed29f06-16d4-4bbe-915a-185c19573c0d	TLDLegitimateProb	-0.575274422114785	url
bf7a0a9b-5fd7-469e-b3f4-f073792035b9	eed29f06-16d4-4bbe-915a-185c19573c0d	URLCharProb	0.5822792190341064	url
47814f56-7ba3-46c3-97fd-928e6abafb9b	eed29f06-16d4-4bbe-915a-185c19573c0d	URLLength	-1.847290890087541	url
8d90663b-96f1-4ac9-aa6b-9702a80aa2eb	eed29f06-16d4-4bbe-915a-185c19573c0d	URLSimilarityIndex	8.948242084529328	url
b0953614-74d9-4946-81a5-4eea82d67462	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	dom	0.2057958302095138	fusion_contribution
9904d88b-4257-4568-ab29-4bb7a1ae13db	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	url	0.7942041697904824	fusion_contribution
95f81d20-ea98-4e4c-8e5b-3f9d4cdb876b	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	visual	3.914791151747826e-15	fusion_contribution
fa56ca83-66b1-4478-8714-fc0b74d8b6a8	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	DomainLength	-1.047458167440988	url
b698eaa1-0d26-47b3-aa8e-99ef6fbafbbe	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	NoOfSubDomain	-10.74156675776787	url
3fa99a4d-5fff-4749-8596-3ea5afafaa1d	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	URLCharProb	1.324176529147861	url
9c05b4ae-f5be-492e-bab4-d779b0a32cc7	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	URLLength	2.234941644378565	url
ac274053-946c-48bf-8dec-dbe087530aa9	56852f87-2b6f-4a32-8c4c-cbb51dfa5b7d	URLSimilarityIndex	7.234458761318351	url
370cc472-9e2e-4512-85f2-02dbb5bd019d	4645ba29-63e8-48eb-a1ff-2aaead17221c	dom	0.3284352230351346	fusion_contribution
d88e40af-1f83-4c41-aac6-3e43c2974473	4645ba29-63e8-48eb-a1ff-2aaead17221c	url	0.6715647769648496	fusion_contribution
4e3032ec-ed24-4099-87d7-d3d446e7688d	4645ba29-63e8-48eb-a1ff-2aaead17221c	visual	1.565586087887737e-14	fusion_contribution
b9da45ac-5eba-409e-817a-4f18bd1abe7a	4645ba29-63e8-48eb-a1ff-2aaead17221c	DomainLength	-0.9485212840727608	url
dae1ffca-647a-40be-a992-2cecd4a9f40a	4645ba29-63e8-48eb-a1ff-2aaead17221c	NoOfSubDomain	-5.173440391265296	url
b4ceacb1-6271-4104-ab24-86aea9d12938	4645ba29-63e8-48eb-a1ff-2aaead17221c	URLCharProb	0.7561671003422579	url
e3f2db7c-f48c-4763-807c-c248e00b5132	4645ba29-63e8-48eb-a1ff-2aaead17221c	URLLength	1.207043044034938	url
8ed7f49f-98a3-4206-bb2b-0dd21a54f8a9	4645ba29-63e8-48eb-a1ff-2aaead17221c	URLSimilarityIndex	-10.17696680574353	url
8b29dece-b090-46a6-adbc-325f0dc254ce	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	dom	0.3284351975528979	fusion_contribution
24a98ffb-5a35-4d17-9455-3da528499b45	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	url	0.6715648024470864	fusion_contribution
efc46985-23e5-44e7-bf92-045ebcb7e5b4	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	visual	1.565586088003753e-14	fusion_contribution
cf4022ba-94e6-4225-8ad8-29495f159e40	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	DomainLength	-2.41503353003634	url
8cbd3a42-274a-4f67-a7c6-2511ebecd87a	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	NoOfSubDomain	0.2744159177652011	url
a3c1197e-ff4d-4510-b39e-aaf3fea714da	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	URLCharProb	0.5680405195354578	url
2ef1c067-b9bb-4774-85f5-1f07ed567fac	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	URLLength	1.458423788128387	url
584e4cde-b737-4a75-9e31-3acea31cfb8b	9a3fdb1b-7022-4a7c-bfe1-067699fd4cbe	URLSimilarityIndex	-12.24683787582958	url
f94595e2-144d-4113-a51f-df4b84b7fdb4	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	dom	0.5116675746539441	fusion_contribution
736e5106-4a26-4da4-ae5c-ffdce6c93cb5	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	url	0.4883324253460538	fusion_contribution
775c88b5-5e21-4926-830a-fd38b6301501	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	visual	2.191248484644293e-15	fusion_contribution
4273cfb1-ca1f-4019-8521-15f31e86b2d2	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	DomainLength	-1.270238943330555	url
ee77a5e0-06d9-4df1-b89b-30af272a7d9c	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	TLDLegitimateProb	-0.8133651624442939	url
ef328584-c2ab-4538-9cee-d8eacb0cf74f	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	URLCharProb	1.259294518220183	url
7046687c-d397-469c-a709-93afbb8f7c1f	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	URLLength	2.38281756365559	url
08f45ed7-fae1-4cfe-b02b-15ec99875422	7bc9ad7a-43aa-46f3-99bd-3411f3d67244	URLSimilarityIndex	9.010425388780728	url
e4313004-490a-4d13-9836-5d2c2ba5dab0	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	dom	0.5116675746539441	fusion_contribution
a82a143e-cae5-4c3f-b14f-6871162edfea	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	url	0.4883324253460538	fusion_contribution
6b201ba8-4b5a-4cfd-ba4b-8eb235af8ec9	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	visual	2.191248484644293e-15	fusion_contribution
bcd1cfb6-707e-4ae4-a109-0363633b821d	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	DomainLength	-1.270238943330555	url
437c7b60-4f88-4aef-95e6-2587860666ae	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	TLDLegitimateProb	-0.8133651624442939	url
d31dc9d1-438d-4958-b95f-a6a163b66369	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	URLCharProb	1.259294518220183	url
5209abbf-02cd-4e6d-9d8d-6d15ffcb956a	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	URLLength	2.38281756365559	url
01d3e8e7-cf9a-41bb-b86c-1b56e79a6eac	8fbf7b0f-a2bc-4e27-b2e8-e8427c806169	URLSimilarityIndex	9.010425388780728	url
7037ee32-8b2c-423d-958b-7399e372ee4f	37f96692-b399-4c3f-8d5e-8689aca06976	dom	0.5116675746539441	fusion_contribution
a733756a-029c-49f1-8961-dfb914995b2d	37f96692-b399-4c3f-8d5e-8689aca06976	url	0.4883324253460538	fusion_contribution
4941f01e-b63d-42a0-b36b-fd426db5aa59	37f96692-b399-4c3f-8d5e-8689aca06976	visual	2.191248484644293e-15	fusion_contribution
12a1127f-69d5-4ac8-936b-2c7ad5e9a7bd	37f96692-b399-4c3f-8d5e-8689aca06976	DomainLength	-1.270238943330555	url
ef562624-d2a9-40e5-97a5-008b4c5af145	37f96692-b399-4c3f-8d5e-8689aca06976	TLDLegitimateProb	-0.8133651624442939	url
d4f6d66d-77b4-4f93-9cb7-5de22406f5c9	37f96692-b399-4c3f-8d5e-8689aca06976	URLCharProb	1.259294518220183	url
3417d2f5-8f78-4aa3-a1f2-7c02316a3ea5	37f96692-b399-4c3f-8d5e-8689aca06976	URLLength	2.38281756365559	url
0a2b547e-c9a5-481f-a8c2-9c78e64b8eab	37f96692-b399-4c3f-8d5e-8689aca06976	URLSimilarityIndex	9.010425388780728	url
9eb73959-a034-4cd7-90d3-9fb00bee6fa9	35aacc94-becc-4793-bca3-97edc618b3d6	dom	0.5116675746539441	fusion_contribution
b721bca9-d4ea-4cd0-b21f-872304c5b950	35aacc94-becc-4793-bca3-97edc618b3d6	url	0.4883324253460538	fusion_contribution
2f300172-8a56-44c9-bd42-7a6d0fad7894	35aacc94-becc-4793-bca3-97edc618b3d6	visual	2.191248484644293e-15	fusion_contribution
fe2aa4cc-a691-4cea-82ba-d806ddc29548	35aacc94-becc-4793-bca3-97edc618b3d6	DomainLength	-1.270238943330555	url
632af471-3d92-4291-85ac-2bc0d98f8e47	35aacc94-becc-4793-bca3-97edc618b3d6	TLDLegitimateProb	-0.8133651624442939	url
2d59e239-2610-424c-acf0-4b075711a50c	35aacc94-becc-4793-bca3-97edc618b3d6	URLCharProb	1.259294518220183	url
7a5c23c3-cc21-429d-8bbd-90948596a4f3	35aacc94-becc-4793-bca3-97edc618b3d6	URLLength	2.38281756365559	url
184f92bc-d221-4bdd-a5b5-b6f11a0296b3	35aacc94-becc-4793-bca3-97edc618b3d6	URLSimilarityIndex	9.010425388780728	url
b9758401-d28c-4d28-9060-0956dc27d216	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	dom	0.5116675746539441	fusion_contribution
e1c5831f-689b-4760-ba30-8c0021d8f3eb	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	url	0.4883324253460538	fusion_contribution
0c807499-a74f-4311-9499-40fd205c6fc7	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	visual	2.191248484644293e-15	fusion_contribution
eaf2fcf5-ef9e-4022-a77f-f52418c9d9da	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	DomainLength	-1.270238943330555	url
c48e001c-a59d-4df5-a82e-5d02b1380315	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	TLDLegitimateProb	-0.8133651624442939	url
f2be215a-1b84-47a8-b46f-26b96c5358ab	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	URLCharProb	1.259294518220183	url
dd9489d3-16b4-42af-8351-981c6c429f92	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	URLLength	2.38281756365559	url
1af331b4-5ed2-4f52-bab3-697efe98480c	1fa73189-8af2-49fc-9768-ac6a04ac1c3e	URLSimilarityIndex	9.010425388780728	url
d08ea6c3-615b-4eea-ab6c-dcc55b6093b2	d3b406d4-02b7-407b-8391-23c9154a3793	dom	0.5116675746539441	fusion_contribution
92a155c8-e72b-40d0-ad03-c2fa180e9a76	d3b406d4-02b7-407b-8391-23c9154a3793	url	0.4883324253460538	fusion_contribution
1ed0a116-9a8e-44e3-b229-56937d94e609	d3b406d4-02b7-407b-8391-23c9154a3793	visual	2.191248484644293e-15	fusion_contribution
44deda9b-b1fe-485b-9733-7411541aa481	d3b406d4-02b7-407b-8391-23c9154a3793	DomainLength	-1.270238943330555	url
55861ddb-917a-4183-b672-a17f7263a1ff	d3b406d4-02b7-407b-8391-23c9154a3793	TLDLegitimateProb	-0.8133651624442939	url
3cfd3867-d07a-46f7-892c-df10206eddac	d3b406d4-02b7-407b-8391-23c9154a3793	URLCharProb	1.259294518220183	url
c4877c4f-fcd7-4a47-86f8-79a04c096c2d	d3b406d4-02b7-407b-8391-23c9154a3793	URLLength	2.38281756365559	url
b956ca1d-4251-4c6d-afab-ee3e6443f9ee	d3b406d4-02b7-407b-8391-23c9154a3793	URLSimilarityIndex	9.010425388780728	url
a8bac2ea-aa14-49f7-a6ae-b9fcf6fc527b	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	dom	0.03818628592950633	fusion_contribution
48ae9558-b394-43d3-9f3b-887c16a88616	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	url	0.961813714070488	fusion_contribution
e1e8893a-9b74-4db5-a0a1-fa5fdf15d90b	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	visual	5.708108256660327e-15	fusion_contribution
a2bf5452-57ea-4f8d-9b97-107853f90a1a	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	NoOfSubDomain	-10.39668158540109	url
ffc8b6b3-1fb7-46c5-838e-8e6abb963062	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	TLDLegitimateProb	-0.4546492098728571	url
54d03274-8450-4f28-a141-c012d9eb4bf3	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	URLCharProb	1.044486431945588	url
857f4622-c58f-47d5-a67d-839bbdcad5a2	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	URLLength	-0.7629749440649743	url
1c13f067-566e-43bb-af72-0e4c1b518ded	3df8ef46-a826-4c3f-a4d5-4ab70aee6c99	URLSimilarityIndex	6.873357308134573	url
84ea79cb-d4ef-4fbb-9cad-31646b46ff35	48fc719b-d625-46a9-8033-c55061f758f1	dom	0.001137905244766648	fusion_contribution
9433be37-edd9-41b7-aedb-ba0ac8876708	48fc719b-d625-46a9-8033-c55061f758f1	url	0.9988620947552292	fusion_contribution
77927a26-852d-44b3-aebb-bf97f1e54bce	48fc719b-d625-46a9-8033-c55061f758f1	visual	4.117312444564245e-15	fusion_contribution
b944421d-a560-4c16-94c2-3985478807bb	48fc719b-d625-46a9-8033-c55061f758f1	DomainLength	-3.184617362547974	url
346a1459-1530-4303-81d2-15b5f0e162ff	48fc719b-d625-46a9-8033-c55061f758f1	TLDLegitimateProb	-0.1931833622726011	url
13cbb90f-9ff9-437e-bf71-9754b9341f2a	48fc719b-d625-46a9-8033-c55061f758f1	URLCharProb	0.9142525832873161	url
d2327bda-702c-41a4-a945-7ed1557100d1	48fc719b-d625-46a9-8033-c55061f758f1	URLLength	3.901484933244723	url
49d1a927-0503-4424-b826-ccca053376ab	48fc719b-d625-46a9-8033-c55061f758f1	URLSimilarityIndex	9.070710460759452	url
c899cf5f-1f2b-46a4-9f21-b80ed07bb793	899ce20e-90d3-48f6-8969-c94d134526d0	dom	0.5116675746580187	fusion_contribution
6a5f6f60-c1dd-40ed-9af0-186700918714	899ce20e-90d3-48f6-8969-c94d134526d0	url	0.488332425341979	fusion_contribution
0bcc532f-3b79-4251-bd92-b0016073c1db	899ce20e-90d3-48f6-8969-c94d134526d0	visual	2.191248485409549e-15	fusion_contribution
03153a8a-f84f-4884-bfdb-e5d6951e0a92	899ce20e-90d3-48f6-8969-c94d134526d0	DomainLength	-2.808455863480861	url
2efb214c-548b-4071-98ac-d5e43d4b8ee5	899ce20e-90d3-48f6-8969-c94d134526d0	TLDLegitimateProb	-0.1942186606412237	url
524f5acf-9808-4497-9a6b-c7c9e4e7bd82	899ce20e-90d3-48f6-8969-c94d134526d0	URLCharProb	1.205062193532467	url
c2439e9b-c9dc-42e3-9a72-30228648d1b8	899ce20e-90d3-48f6-8969-c94d134526d0	URLLength	3.654117924472773	url
a2145e8c-7968-4f50-8bf1-8f8ca93e03d1	899ce20e-90d3-48f6-8969-c94d134526d0	URLSimilarityIndex	9.088640065456557	url
c8167d6f-8333-4a11-b698-674e2fc4bd97	16588a9a-a08d-4ea6-a355-733a5af00ce4	dom	0.1031729559008072	fusion_contribution
9a98d969-00c8-4b76-a8ad-2b88906b4ba3	16588a9a-a08d-4ea6-a355-733a5af00ce4	url	0.8968270440991771	fusion_contribution
a61dea6d-eb66-4976-bad4-aab885601b6a	16588a9a-a08d-4ea6-a355-733a5af00ce4	visual	1.565575549542186e-14	fusion_contribution
ef4387d8-da88-42b2-8db3-41fd7893d793	16588a9a-a08d-4ea6-a355-733a5af00ce4	DomainLength	-1.602367278170248	url
a2dfa208-3513-4eb8-ad74-b7ed3bf39460	16588a9a-a08d-4ea6-a355-733a5af00ce4	NoOfSubDomain	0.1230829930930685	url
6f9aaf26-20cc-45bc-a99a-366646e706bd	16588a9a-a08d-4ea6-a355-733a5af00ce4	URLCharProb	0.5747162014041999	url
821b5246-2147-4a4d-a0e6-6788c64d5fd3	16588a9a-a08d-4ea6-a355-733a5af00ce4	URLLength	1.150244185590832	url
b6e2d7bf-4532-4d81-9e6e-b496989bc23a	16588a9a-a08d-4ea6-a355-733a5af00ce4	URLSimilarityIndex	-12.22068209170652	url
91178097-c0ca-4feb-8de7-4fd020a349b8	759ed6b6-5d3f-45b7-a849-cb35940d4f84	dom	0.1059735877591535	fusion_contribution
d2c2c89e-1144-40a8-bc25-441d5a084635	759ed6b6-5d3f-45b7-a849-cb35940d4f84	url	0.8940264122405828	fusion_contribution
197b1bca-5031-4d3c-9cd2-274543894b4e	759ed6b6-5d3f-45b7-a849-cb35940d4f84	visual	2.637584319207258e-13	fusion_contribution
a5bc9698-5405-4746-8fd8-45781d8777b4	759ed6b6-5d3f-45b7-a849-cb35940d4f84	DomainLength	-3.136195295289998	url
b1c448b2-ded0-4378-873d-255507fb4a3c	759ed6b6-5d3f-45b7-a849-cb35940d4f84	TLDLegitimateProb	-0.5080094502008695	url
e9dc72b1-0af3-4459-863e-12a976edcecb	759ed6b6-5d3f-45b7-a849-cb35940d4f84	URLCharProb	0.4836616425898016	url
df63c44e-121e-4d9a-8543-b617823d3b5c	759ed6b6-5d3f-45b7-a849-cb35940d4f84	URLLength	3.338823769713841	url
827349e3-d117-4643-8002-bcf20d43440a	759ed6b6-5d3f-45b7-a849-cb35940d4f84	URLSimilarityIndex	8.936656772475475	url
6163d85f-dbb1-4a35-9d14-656ca96ac810	e4526726-d01c-4c06-b7dc-bd3952dc868c	dom	0.1031729559008072	fusion_contribution
77296441-bfdd-4303-b713-7ea436084c81	e4526726-d01c-4c06-b7dc-bd3952dc868c	url	0.8968270440991771	fusion_contribution
5256a7e8-960a-4ab2-b666-04a3736cd2ec	e4526726-d01c-4c06-b7dc-bd3952dc868c	visual	1.565575549542186e-14	fusion_contribution
69e939cb-0c02-4ee4-a889-90395f503437	e4526726-d01c-4c06-b7dc-bd3952dc868c	DomainLength	-1.602367278170248	url
cfaaa859-836c-406d-9d73-3f253b267c4a	e4526726-d01c-4c06-b7dc-bd3952dc868c	NoOfSubDomain	0.1230829930930685	url
d4a88cfe-5595-4cb2-a0e1-0ea34de2be22	e4526726-d01c-4c06-b7dc-bd3952dc868c	URLCharProb	0.5747162014041999	url
f9c8e18d-86cb-4012-b490-b26eabf60418	e4526726-d01c-4c06-b7dc-bd3952dc868c	URLLength	1.150244185590832	url
75bdc611-3a76-49c0-af10-7fc90ac410b1	e4526726-d01c-4c06-b7dc-bd3952dc868c	URLSimilarityIndex	-12.22068209170652	url
5f3fa9b7-9a08-48d7-be9f-cc75fa2cf9b3	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	dom	0.1059735877591528	fusion_contribution
a4eb66ce-bfc1-4d8b-88b5-a73e3eaca09c	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	url	0.8940264122408437	fusion_contribution
54f78fc0-4a30-48e8-b6cc-3e42bae74cb7	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	visual	3.624504262171163e-15	fusion_contribution
b28ac190-b23a-4e57-929c-41eb9c5e452a	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	DomainLength	-3.136195295289998	url
a7a94421-408a-497c-a545-03e1554ab9db	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	TLDLegitimateProb	-0.5080094502008695	url
1118a912-5a3b-49e5-8f43-9a899841199b	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	URLCharProb	0.4836616425898016	url
7d1afe9e-054c-479d-968f-f52715a4d4e1	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	URLLength	3.338823769713841	url
51de9046-6255-4342-9126-89fb583d6777	fbfc5e19-941f-48d3-ad43-9ac2a6629a87	URLSimilarityIndex	8.936656772475475	url
9c02e6ea-d2a3-4e2f-8b0f-5d36c1a8a482	e251d3c5-0422-4362-a170-201d329c6ba9	dom	0.1059735877591528	fusion_contribution
b9f2b076-40c7-4484-a422-013cb0ad061a	e251d3c5-0422-4362-a170-201d329c6ba9	url	0.8940264122408437	fusion_contribution
06c3b9f3-56ef-4516-bed6-a24ea11c9f8f	e251d3c5-0422-4362-a170-201d329c6ba9	visual	3.624504262171163e-15	fusion_contribution
dc70b013-f362-4e84-b534-8bb96a578346	e251d3c5-0422-4362-a170-201d329c6ba9	DomainLength	-3.136195295289998	url
3fbde800-0b48-4c9f-af65-c0c6b8a6f7ac	e251d3c5-0422-4362-a170-201d329c6ba9	TLDLegitimateProb	-0.5080094502008695	url
da63baae-b084-4e55-84f1-95671fe4f469	e251d3c5-0422-4362-a170-201d329c6ba9	URLCharProb	0.4836616425898016	url
d01df4ff-4b04-4646-a3d4-088e2e7763f8	e251d3c5-0422-4362-a170-201d329c6ba9	URLLength	3.338823769713841	url
28d861b7-87fc-4513-843f-a2e73a095ac7	e251d3c5-0422-4362-a170-201d329c6ba9	URLSimilarityIndex	8.936656772475475	url
61f29e99-1f57-4f5f-9e39-9ab506d5ce2b	bebedffc-547d-4533-bcae-7ec61125253e	dom	0.1266283050740825	fusion_contribution
071afd52-d5d0-4511-81d8-ca120191f724	bebedffc-547d-4533-bcae-7ec61125253e	url	0.8733716949256821	fusion_contribution
461694d4-9d93-4f50-8186-d3b4672147d2	bebedffc-547d-4533-bcae-7ec61125253e	visual	2.354879142686972e-13	fusion_contribution
498f4e5a-831d-4154-bdd7-088b86fb4bdb	bebedffc-547d-4533-bcae-7ec61125253e	DomainLength	-3.136195295289998	url
72831b66-e31c-4700-8c8e-3783deab3853	bebedffc-547d-4533-bcae-7ec61125253e	TLDLegitimateProb	-0.5080094502008695	url
51fb6d4b-a3e5-4d8d-a68d-9e9e1019d7e4	bebedffc-547d-4533-bcae-7ec61125253e	URLCharProb	0.4836616425898016	url
42efa504-dd48-4b9d-8e54-ca6da17f5a58	bebedffc-547d-4533-bcae-7ec61125253e	URLLength	3.338823769713841	url
849ada37-7dc0-44b0-ad8a-fd0b3eb7e7b3	bebedffc-547d-4533-bcae-7ec61125253e	URLSimilarityIndex	8.936656772475475	url
6049cf99-e467-46e2-a244-1ebbd824f6f0	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	dom	0.04867332582829274	fusion_contribution
941034eb-ebcd-4512-ad95-af17c9768107	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	url	0.9513266741717074	fusion_contribution
f6f82c69-3d23-4029-bc91-3046f9d9fba3	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	visual	0	fusion_contribution
52ff7ef5-2b5d-4d70-902e-596d1593ea8f	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	CharContinuationRate	4.936589470640384	url
4d853c7c-66b4-497f-8359-378348388479	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	DomainLength	0.6120420279719988	url
1ef618a0-d644-4b9b-b5f5-8ba52c612f66	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	NoOfSubDomain	-0.5637330153352172	url
25f90087-0538-46fd-a69a-0c6f452123c9	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	TLDLength	-0.3078195179367694	url
d5ff36b7-0a66-4024-a75e-8f568f0ba3b4	b9d53fde-f90e-46ad-ac4f-a81cff830b5c	URLLength	1.597227015799009	url
bb5a786b-ba39-4940-9365-47bbd7ba1b0d	97850437-4ba9-42a6-830c-8d5f30c8fa79	dom	0.03444072511842811	fusion_contribution
dddce7d1-93a8-4c18-bfbb-4d7440012349	97850437-4ba9-42a6-830c-8d5f30c8fa79	url	0.9655592748815719	fusion_contribution
baf6510f-a4e8-4b36-9e1b-95d047b2f9c6	97850437-4ba9-42a6-830c-8d5f30c8fa79	visual	0	fusion_contribution
de3c645a-74e5-4fe4-ab97-33e4cb730ca9	97850437-4ba9-42a6-830c-8d5f30c8fa79	CharContinuationRate	3.845132450744186	url
1bc62a7d-8fba-4d8f-9ed7-c78257345aad	97850437-4ba9-42a6-830c-8d5f30c8fa79	NoOfSubDomain	-0.2119198979461344	url
0c51fec3-0618-49c4-ba31-ca689c7844c2	97850437-4ba9-42a6-830c-8d5f30c8fa79	PathDepth	-0.2245246027658019	url
003a23c8-3283-44ab-b483-4ad0948b013f	97850437-4ba9-42a6-830c-8d5f30c8fa79	TLDLength	-0.7143153784233608	url
cd523a9f-9762-4527-9792-0752de3d41b4	97850437-4ba9-42a6-830c-8d5f30c8fa79	URLLength	1.191926896252355	url
cd3c6989-7e37-4482-b960-fa29b31d71f6	950c31d1-3924-496a-9165-9c1812261f8b	dom	0.09619578814685516	fusion_contribution
8a7327e3-d1b5-461b-8d37-6da59e406bdb	950c31d1-3924-496a-9165-9c1812261f8b	url	0.9038042118531447	fusion_contribution
1d4e78cb-7882-446e-8dc0-25b2a5821f07	950c31d1-3924-496a-9165-9c1812261f8b	visual	0	fusion_contribution
a8218b5c-0a04-4b1c-97b4-bd0054f20b22	950c31d1-3924-496a-9165-9c1812261f8b	BrandKeywordInSLD	1.498079648840845	url
f2bb00fa-c9af-4d1b-94b5-921ce68fc621	950c31d1-3924-496a-9165-9c1812261f8b	DomainDigitRatio	1.830200008165158	url
47702bdf-1588-44de-8295-90e3e27c3aaa	950c31d1-3924-496a-9165-9c1812261f8b	DomainLength	2.421523292870166	url
20881259-4b60-4bea-bc22-990a96b2562f	950c31d1-3924-496a-9165-9c1812261f8b	NoOfSubDomain	3.404412896581436	url
60399264-ce34-425f-a946-a85fd10f494b	950c31d1-3924-496a-9165-9c1812261f8b	URLEntropy	-0.5933372588437681	url
aba9265c-5922-43ee-bc05-64a4f9de4d9c	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	dom	0.1503587394745188	fusion_contribution
dcc5839f-765b-4b8e-817a-48c2b382c45f	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	url	0.8496412605254811	fusion_contribution
b098d8be-6070-4ffd-a90e-0766ab05236b	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	visual	0	fusion_contribution
e97a9b95-f609-43ad-bf83-02731cc5cf2c	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	DomainLength	-1.399241753360218	url
77d5ebbf-039b-4154-aeba-328f0c22274f	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	NoOfSubDomain	-0.7082312105056752	url
5dd3833b-b2f3-4c30-8e1f-ed6727ffa973	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	TLDLength	-0.4136865836134727	url
2c89e7df-d45a-4b91-893b-3f76a8bf04bf	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	URLEntropy	-0.4113044659887882	url
09451384-1312-4724-863d-120b8e424085	91709f0d-7a72-457f-a0b4-1b703ba4d1f6	URLLength	-2.263189536111186	url
fbd3f377-19dc-4351-8487-e6728e65630c	de84e960-90b3-401c-afe2-208610d97082	dom	0.079844686136679	fusion_contribution
8f254484-548d-40d2-abf1-c36237ad589d	de84e960-90b3-401c-afe2-208610d97082	url	0.920155313863321	fusion_contribution
4f5a1413-e903-4b27-87a2-09f9fa04cf0d	de84e960-90b3-401c-afe2-208610d97082	visual	0	fusion_contribution
09d00c1d-30fd-4c0b-b35b-751f08f45e5e	de84e960-90b3-401c-afe2-208610d97082	DomainDigitRatio	-0.3354256916093685	url
49449f9c-2366-4409-b129-a1be953dc577	de84e960-90b3-401c-afe2-208610d97082	DomainHyphenCount	-0.1510833243672704	url
542e622d-e4e9-46a8-a57b-09d0cf4f2405	de84e960-90b3-401c-afe2-208610d97082	DomainLength	4.181653998453258	url
8800673f-d6e7-42b9-a604-f1ab3bb0fa89	de84e960-90b3-401c-afe2-208610d97082	NoOfSubDomain	-0.7414368814524702	url
3f9fb88d-31b9-4bf4-bae5-9b7fc509b6f4	de84e960-90b3-401c-afe2-208610d97082	URLLength	6.32402678201781	url
2ddc6355-30ab-4174-b856-ef4e119477b9	05ea93c9-c62b-4aa3-8927-1fe044873807	dom	0.07984468613667896	fusion_contribution
c231666e-f53b-4a7d-9d6b-07a2c47109a8	05ea93c9-c62b-4aa3-8927-1fe044873807	url	0.9201553138633211	fusion_contribution
3cd971c1-a22b-4739-8228-10dc95a7591a	05ea93c9-c62b-4aa3-8927-1fe044873807	visual	0	fusion_contribution
33f3a16e-c9fe-451a-8fd2-9393238fea07	05ea93c9-c62b-4aa3-8927-1fe044873807	DomainDigitRatio	-0.1963529563193827	url
cad26db0-f7d1-455d-afd6-595cdb3f3094	05ea93c9-c62b-4aa3-8927-1fe044873807	DomainLength	4.30760951808411	url
f53e1787-c045-46dd-9b29-e29a7808456c	05ea93c9-c62b-4aa3-8927-1fe044873807	NoOfSubDomain	-0.5773827982068228	url
b7490163-91c1-4f66-b675-6d95c983745d	05ea93c9-c62b-4aa3-8927-1fe044873807	URLEntropy	-0.6201588452730237	url
f157cdd0-466a-43b7-8d9b-9e0006ed0a06	05ea93c9-c62b-4aa3-8927-1fe044873807	URLLength	3.290085901082187	url
348676ae-1cbb-44fe-983d-f3948f9207b3	3fc325da-891f-4b79-9590-d28967b1bb1a	dom	0.1564510791591288	fusion_contribution
6bf9024b-b4fa-4173-a09f-a19950f941a2	3fc325da-891f-4b79-9590-d28967b1bb1a	url	0.8435489208408713	fusion_contribution
17883d13-2ad3-4249-823a-cb955e46948e	3fc325da-891f-4b79-9590-d28967b1bb1a	visual	0	fusion_contribution
7db7020c-5953-450e-9da2-10ae023a78e4	3fc325da-891f-4b79-9590-d28967b1bb1a	DomainDigitRatio	-0.2594358760583059	url
ad826794-58dc-4880-beee-f1430bbfa743	3fc325da-891f-4b79-9590-d28967b1bb1a	DomainLength	-1.636222527460144	url
1b2042f4-ce0c-4d16-8acd-6bf623a344e7	3fc325da-891f-4b79-9590-d28967b1bb1a	NoOfSubDomain	-0.7932323392747107	url
a8711ce5-e470-4d4f-b6dd-a50cb0d65fe0	3fc325da-891f-4b79-9590-d28967b1bb1a	URLEntropy	-0.5352585168766395	url
7cd7bf48-1f46-46ef-99ad-efcd608f816c	3fc325da-891f-4b79-9590-d28967b1bb1a	URLLength	-2.211579049086214	url
c849e455-1965-4612-be7f-783291068a8f	af59e363-88ab-4976-a868-5d59c5ce6b5f	dom	0.1484649296655988	fusion_contribution
4031e5e5-ae0f-44d3-aa0a-225b3de9ed5a	af59e363-88ab-4976-a868-5d59c5ce6b5f	url	0.8515350703344012	fusion_contribution
5d041179-9dd4-4209-9ab7-b6914b04a711	af59e363-88ab-4976-a868-5d59c5ce6b5f	visual	0	fusion_contribution
0a7f2942-aa12-49d7-9bb6-097984565cf8	af59e363-88ab-4976-a868-5d59c5ce6b5f	DomainDigitRatio	3.10260604843486	url
0fc35342-fa0f-4c3c-94a7-d0711418352a	af59e363-88ab-4976-a868-5d59c5ce6b5f	DomainLength	1.626865135160571	url
e6ca7445-6527-43d6-8b09-c83ffe96f874	af59e363-88ab-4976-a868-5d59c5ce6b5f	IsSLDNumeric	-1.261012167915916	url
e1a6aaca-b921-4c9e-ab99-89f1a7490510	af59e363-88ab-4976-a868-5d59c5ce6b5f	NoOfSubDomain	4.21137351794261	url
50b608c2-c1d8-477f-867e-d325cb8d4a9f	af59e363-88ab-4976-a868-5d59c5ce6b5f	TLDLength	0.54743450701057	url
8e0fad5c-d278-47a4-8edf-52950422fd3c	74e9a624-df2f-481b-9358-57a7af5a7577	dom	0.1636209020616906	fusion_contribution
2aa4579b-63bd-4f00-80da-502261db8ff4	74e9a624-df2f-481b-9358-57a7af5a7577	url	0.8363790979383094	fusion_contribution
a12dd15f-bc09-4be6-9b5e-0bac7e9a871f	74e9a624-df2f-481b-9358-57a7af5a7577	visual	0	fusion_contribution
756c537f-372e-48fb-8917-635170b57792	74e9a624-df2f-481b-9358-57a7af5a7577	DomainLength	-1.399241753360218	url
dd59432b-84b8-4f9e-9bcb-5427c3305c8f	74e9a624-df2f-481b-9358-57a7af5a7577	NoOfSubDomain	-0.7082312105056752	url
c899557c-b357-42d4-9463-af6b03d7bdc0	74e9a624-df2f-481b-9358-57a7af5a7577	TLDLength	-0.4136865836134727	url
4b238efe-fbdc-4daf-9afa-89bd1077ee03	74e9a624-df2f-481b-9358-57a7af5a7577	URLEntropy	-0.4113044659887882	url
3cde904b-9314-4b50-952d-f375db01d821	74e9a624-df2f-481b-9358-57a7af5a7577	URLLength	-2.263189536111186	url
484091dd-eb2a-4ef4-b30f-f21539c6cc04	446d8195-4833-4bff-8619-482b585e9157	dom	0.1636209020616906	fusion_contribution
a2323cc2-4a02-453b-a90d-2cc4d2cf9a4a	446d8195-4833-4bff-8619-482b585e9157	url	0.8363790979383094	fusion_contribution
ca4403aa-29b4-4a87-96f6-9deab7e3d5a8	446d8195-4833-4bff-8619-482b585e9157	visual	0	fusion_contribution
3aabfb90-24fd-4988-a800-c6aa7574b5f8	446d8195-4833-4bff-8619-482b585e9157	DomainLength	-1.399241753360218	url
dbf39c1b-317a-4590-9e11-58587fc75e3c	446d8195-4833-4bff-8619-482b585e9157	NoOfSubDomain	-0.7082312105056752	url
3e7c3e71-4499-4654-a4b3-581c5c12035d	446d8195-4833-4bff-8619-482b585e9157	TLDLength	-0.4136865836134727	url
d1760104-f6fb-4aeb-9c02-f84ffa7f09d3	446d8195-4833-4bff-8619-482b585e9157	URLEntropy	-0.4113044659887882	url
3747d339-d835-4649-aea8-c2106f3f497c	446d8195-4833-4bff-8619-482b585e9157	URLLength	-2.263189536111186	url
2db0a5d7-e40d-4df7-8485-2fa129920f2b	2c80758a-0e51-41f5-a1a9-f96693c31401	dom	0.1465434407338937	fusion_contribution
3768c4e7-a84c-43ae-aba1-1e50b546cba8	2c80758a-0e51-41f5-a1a9-f96693c31401	url	0.8534565592661062	fusion_contribution
768df655-328b-4a67-8164-762704266d72	2c80758a-0e51-41f5-a1a9-f96693c31401	visual	0	fusion_contribution
e471fae5-d165-4191-963b-7c50e2282941	2c80758a-0e51-41f5-a1a9-f96693c31401	DomainDigitRatio	-0.2594358760583059	url
25477435-fab7-4d7d-8edf-864448e62265	2c80758a-0e51-41f5-a1a9-f96693c31401	DomainLength	-1.636222527460144	url
4f250cf7-ec77-48ec-9f13-1a08f1ea1d54	2c80758a-0e51-41f5-a1a9-f96693c31401	NoOfSubDomain	-0.7932323392747107	url
86fe0e51-a752-4d11-94e1-e002055fcf2e	2c80758a-0e51-41f5-a1a9-f96693c31401	URLEntropy	-0.5352585168766395	url
3c9e4be4-dca7-487b-ac5c-2ad4901ef571	2c80758a-0e51-41f5-a1a9-f96693c31401	URLLength	-2.211579049086214	url
fd9031fe-7082-4cef-a637-2dd893dc5954	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	dom	0.1541120373513516	fusion_contribution
2d62fa7e-0804-4b4f-b794-1bea4aa37078	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	url	0.8458879626486484	fusion_contribution
1632216e-406d-42ad-bd52-0d9a34e954cf	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	visual	0	fusion_contribution
b0a067ac-bf6e-41a1-b232-9fe74ba15ef4	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	DomainLength	-1.399241753360218	url
c36cf1a8-717d-43f9-a508-060a71bdf165	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	NoOfSubDomain	-0.7082312105056752	url
dfbad6fc-7465-491e-9c47-3cb692039aa2	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	TLDLength	-0.4136865836134727	url
5dd9c1c9-d198-4c5b-94c9-98b5ecb561de	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	URLEntropy	-0.4113044659887882	url
710cee1e-8675-413e-99ed-23899db0ebe2	112c96e9-5531-4fc4-9fa5-98a4f88a1c19	URLLength	-2.263189536111186	url
5728289c-d4ab-49d6-8371-af4b1202db3f	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	dom	0.1636209020616906	fusion_contribution
60c66a92-2c49-43de-9363-f811cf596005	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	url	0.8363790979383094	fusion_contribution
14d472a9-a243-491a-affb-066bdc07c3a7	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	visual	0	fusion_contribution
ced1387f-98d7-4869-8924-478a013b1a2b	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	DomainLength	-1.399241753360218	url
cd704c1b-59e5-4e18-826b-29297d19ec00	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	NoOfSubDomain	-0.7082312105056752	url
45a95b9c-928c-4c7d-b54b-48d2877aa07a	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	TLDLength	-0.4136865836134727	url
c65cd910-fefc-4c15-b00d-87a16fb68888	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	URLEntropy	-0.4113044659887882	url
43b72f77-3963-463c-a8f4-1a1ee0caf828	65d06fc9-35d3-4c83-baa0-0aa5f02139b1	URLLength	-2.263189536111186	url
53e9ee90-06be-475a-af2d-79beffeed224	3f3410de-07d6-44b1-88c8-f3e6261f863e	dom	0.0664028106651719	fusion_contribution
02f49660-36e9-423b-8d88-cf3e9f46dfce	3f3410de-07d6-44b1-88c8-f3e6261f863e	url	0.933597189334828	fusion_contribution
4ff9ca6a-701e-47e2-a82e-fe2959b55d63	3f3410de-07d6-44b1-88c8-f3e6261f863e	visual	0	fusion_contribution
92695857-dca8-41bc-875a-fd4a68bb21bc	3f3410de-07d6-44b1-88c8-f3e6261f863e	DomainDigitRatio	-0.2643265946571419	url
32373834-9158-462f-96c3-73b276c67c5a	3f3410de-07d6-44b1-88c8-f3e6261f863e	DomainLength	-2.136973310242229	url
c169b1c9-d859-4b36-802c-70895d407e1d	3f3410de-07d6-44b1-88c8-f3e6261f863e	NoOfSubDomain	-0.7578717532764752	url
028b5d5a-c763-47cf-99d0-eba85e0ed365	3f3410de-07d6-44b1-88c8-f3e6261f863e	URLEntropy	-0.2920067931302124	url
96c25296-49ab-490a-88f7-86a39d445776	3f3410de-07d6-44b1-88c8-f3e6261f863e	URLLength	-1.948073038802442	url
4f4bb59c-325a-443f-a6ee-4caa5cdcb722	36d6fef1-5101-48da-8503-787bff1a8180	dom	0.1699334655116397	fusion_contribution
d593d99d-dfab-4af2-a823-d3e627690944	36d6fef1-5101-48da-8503-787bff1a8180	url	0.8300665344883603	fusion_contribution
621e6dbe-ef35-4fe8-9354-db7bba863b6b	36d6fef1-5101-48da-8503-787bff1a8180	visual	0	fusion_contribution
d93f9db1-a1df-4df4-b42b-3d0067f5f0c6	36d6fef1-5101-48da-8503-787bff1a8180	DomainDigitRatio	-0.3487611101128419	url
14e60bdb-951d-450c-b989-f231c5dc435e	36d6fef1-5101-48da-8503-787bff1a8180	DomainLength	3.20768296610601	url
293b9ce4-aea3-41c2-a7d7-d15567126366	36d6fef1-5101-48da-8503-787bff1a8180	NoOfSubDomain	-0.5936983588063123	url
1dbdc25b-0dff-427f-817f-471a4c8638de	36d6fef1-5101-48da-8503-787bff1a8180	TLDLength	-0.8263579882756337	url
4b44f304-1beb-454e-a5cf-24177cd87bdb	36d6fef1-5101-48da-8503-787bff1a8180	URLLength	9.115497341632176	url
1d0c7259-8d2d-4c1d-9132-3daee1c296dc	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	dom	0.5308813479222979	fusion_contribution
f25a2db5-d95b-4ea9-bce8-7dec75b262c8	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	url	0.4691186520777021	fusion_contribution
bb8d5f6c-5a18-4850-b988-ae58e4c38da8	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	visual	0	fusion_contribution
0c96479e-436a-4702-9521-67e88963ec45	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	DomainDigitRatio	-0.2923836201624746	url
fcedae7a-3af4-4092-aa7f-b79664f5a3db	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	DomainLength	-1.366593235180057	url
6cf8b2e3-015e-4a53-ad34-74ea761f3635	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	NoOfSubDomain	-0.8013200574822359	url
7cf06fd8-4ef5-4fb6-8dcd-2a2154a61fa5	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	URLEntropy	-0.3149295816284248	url
cd18f555-66d5-4358-9bb4-c1e251ab17b4	8087cdcf-8f63-4a27-b3cd-ecb8facea02c	URLLength	-2.286868164607356	url
9b8c3e88-9d4a-496f-930c-75e0cf8328bc	341e350e-25e3-4f99-9105-36c6766c4ab9	dom	0.1334182764355293	fusion_contribution
ec123a2e-a43c-4202-9aff-8b4d5a74bdd5	341e350e-25e3-4f99-9105-36c6766c4ab9	url	0.8665817235644708	fusion_contribution
a65be7d9-a5c0-4bb2-9d1a-6ce0974cd59b	341e350e-25e3-4f99-9105-36c6766c4ab9	visual	0	fusion_contribution
af064f31-f11f-49d8-b487-3de8d4312c40	341e350e-25e3-4f99-9105-36c6766c4ab9	DomainLength	-1.399241753360218	url
42e39602-9b99-4511-a194-291e32ae64c1	341e350e-25e3-4f99-9105-36c6766c4ab9	NoOfSubDomain	-0.7082312105056752	url
97ba2290-615f-4a0a-84c3-cdcc03e2c836	341e350e-25e3-4f99-9105-36c6766c4ab9	TLDLength	-0.4136865836134727	url
9fdcf307-89d4-463a-9772-e383d27a08f2	341e350e-25e3-4f99-9105-36c6766c4ab9	URLEntropy	-0.4113044659887882	url
ff6888e5-d6be-4038-9368-2f57516b504b	341e350e-25e3-4f99-9105-36c6766c4ab9	URLLength	-2.263189536111186	url
5cccae2b-1a2f-4970-86b6-dc2f9bcbc680	6f9d55db-607e-42f1-8d81-40324d1d02b9	dom	0.1334182764355293	fusion_contribution
c6b4b7fc-863f-49dc-bb36-4d5651ae15dd	6f9d55db-607e-42f1-8d81-40324d1d02b9	url	0.8665817235644708	fusion_contribution
b4551f05-56cf-41de-b166-762dbfbcd32b	6f9d55db-607e-42f1-8d81-40324d1d02b9	visual	0	fusion_contribution
06e69237-5aab-4186-b354-1ff421ff0f71	6f9d55db-607e-42f1-8d81-40324d1d02b9	DomainLength	-1.399241753360218	url
8cd0bb51-0a58-4532-b241-11acf71f77f7	6f9d55db-607e-42f1-8d81-40324d1d02b9	NoOfSubDomain	-0.7082312105056752	url
b509c77c-2104-4080-83c4-bc02d18debf6	6f9d55db-607e-42f1-8d81-40324d1d02b9	TLDLength	-0.4136865836134727	url
1ce0e34b-7711-4bf3-8dea-dd577f749bd0	6f9d55db-607e-42f1-8d81-40324d1d02b9	URLEntropy	-0.4113044659887882	url
0d9359e2-29e4-4caa-a23c-d5aac8a28144	6f9d55db-607e-42f1-8d81-40324d1d02b9	URLLength	-2.263189536111186	url
7fd85a83-e995-4bca-9fd6-336916a05573	7e62a949-c05a-4b12-bbcc-c80379700ff2	dom	0.007801250281093527	fusion_contribution
9e5d1d7a-4e4b-4b49-803b-6146a4d4933d	7e62a949-c05a-4b12-bbcc-c80379700ff2	url	0.9921987497189064	fusion_contribution
fe31f11d-c140-4eb1-8c55-f95bbf695566	7e62a949-c05a-4b12-bbcc-c80379700ff2	visual	0	fusion_contribution
10fc2387-a1b9-43ee-a72f-f769af8e05cb	7e62a949-c05a-4b12-bbcc-c80379700ff2	DomainDigitRatio	-0.5815390082996001	url
cb6150f1-7189-4326-93e6-9c1df18ea094	7e62a949-c05a-4b12-bbcc-c80379700ff2	DomainLength	3.822867575382478	url
c4eda313-0d90-4342-a074-17a6e04e30d3	7e62a949-c05a-4b12-bbcc-c80379700ff2	NoOfSubDomain	-1.198911667274434	url
9ee4476d-ba3a-45a0-a4c6-3c1d97ff3690	7e62a949-c05a-4b12-bbcc-c80379700ff2	URLEntropy	0.9058859288507032	url
5c22d349-1e1f-4d78-b06c-92db055697f4	7e62a949-c05a-4b12-bbcc-c80379700ff2	URLLength	6.17568485430987	url
b07dcd88-c4c4-4a1e-ab81-98b3278f5d86	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	dom	0.07209388166740004	fusion_contribution
61456447-08b4-44ff-9338-4c40a2836a8f	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	url	0.9279061183326	fusion_contribution
86ea49af-2672-4ead-9261-d3f853071b4c	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	visual	0	fusion_contribution
3c470d17-d823-4834-963f-cd511978cd6e	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	DomainDigitRatio	-0.5815390082996001	url
8e3fd5cf-c691-48a1-a7e8-5104a474fa0f	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	DomainLength	3.822867575382478	url
4954ac67-123f-4ee2-b5a7-e6da4b7c1943	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	NoOfSubDomain	-1.198911667274434	url
8d9c9f32-c03c-417a-b43a-f6b6ef30c55c	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	URLEntropy	0.9058859288507032	url
bbbafb21-1229-4cb2-a6df-5b42976d30a0	7541f7a3-d57f-4aeb-8065-1d81a9dd891f	URLLength	6.17568485430987	url
a6130a76-68bf-4f62-8c04-f98286c7e0fb	9d38efe7-4d9b-4adb-9845-a94914d84946	dom	0.007801250281093518	fusion_contribution
67c0ca9e-794d-4d3e-8a9d-0315bfa454f3	9d38efe7-4d9b-4adb-9845-a94914d84946	url	0.9921987497189065	fusion_contribution
324790a7-ba0d-4e57-8768-a91fe279858c	9d38efe7-4d9b-4adb-9845-a94914d84946	visual	0	fusion_contribution
9cb1bb92-7e89-4a33-aa3c-20e4d74d1278	9d38efe7-4d9b-4adb-9845-a94914d84946	DomainDigitRatio	-0.5466255213549248	url
c01a350e-63c3-4ef4-ab80-5ba81f94b18e	9d38efe7-4d9b-4adb-9845-a94914d84946	DomainLength	3.648110690465651	url
c7a81f73-2ef5-4ea9-9144-e90b146d5253	9d38efe7-4d9b-4adb-9845-a94914d84946	NoOfSubDomain	-1.116390616105656	url
9521690c-1d46-417b-988a-4e4150147ef4	9d38efe7-4d9b-4adb-9845-a94914d84946	URLEntropy	2.704703071189852	url
6e68bec0-aad3-4d71-98e7-7a0e62c678e6	9d38efe7-4d9b-4adb-9845-a94914d84946	URLLength	5.741310731569306	url
ec4357e0-f372-4b33-bb4b-e2d4d01f9f41	2f167f9d-6c13-49da-bee9-b929b63b7969	dom	0.1441686284122421	fusion_contribution
fd32a136-b1c8-4525-9870-b64992920189	2f167f9d-6c13-49da-bee9-b929b63b7969	url	0.855831371587758	fusion_contribution
c7894b78-40ad-4da0-8f4a-e80faf0e3675	2f167f9d-6c13-49da-bee9-b929b63b7969	visual	0	fusion_contribution
2a1593c3-dd4b-461d-abb0-080efdff6d5a	2f167f9d-6c13-49da-bee9-b929b63b7969	DomainLength	-1.399241753360218	url
a9a93550-8e7b-4616-adf2-20148f7b6a16	2f167f9d-6c13-49da-bee9-b929b63b7969	NoOfSubDomain	-0.7082312105056752	url
464474aa-03fa-4df0-8c66-c8a05a6c32e8	2f167f9d-6c13-49da-bee9-b929b63b7969	TLDLength	-0.4136865836134727	url
76ab7a87-459e-4150-b64d-44bcb8d1e249	2f167f9d-6c13-49da-bee9-b929b63b7969	URLEntropy	-0.4113044659887882	url
989f8fe3-24b6-4089-acc9-8020e88b768a	2f167f9d-6c13-49da-bee9-b929b63b7969	URLLength	-2.263189536111186	url
2f9bcabc-ef11-484a-b174-1b5e3a982b88	61a10b3a-5792-4e91-bf33-a62dd709ccd7	dom	0.1441686284122421	fusion_contribution
09bf1a28-c70e-4070-b0e3-e7b9f706f20f	61a10b3a-5792-4e91-bf33-a62dd709ccd7	url	0.855831371587758	fusion_contribution
63fa34cf-8feb-46a7-8463-6120cef023e3	61a10b3a-5792-4e91-bf33-a62dd709ccd7	visual	0	fusion_contribution
61df1170-fe63-4514-be5d-183710904b7d	61a10b3a-5792-4e91-bf33-a62dd709ccd7	DomainLength	-1.399241753360218	url
0e7c28e7-c554-40bd-af9a-7ddfe2a94f82	61a10b3a-5792-4e91-bf33-a62dd709ccd7	NoOfSubDomain	-0.7082312105056752	url
2ab930bf-157a-418c-b40c-7f698850c35a	61a10b3a-5792-4e91-bf33-a62dd709ccd7	TLDLength	-0.4136865836134727	url
0767b7e5-c915-4457-938b-dad548f63d16	61a10b3a-5792-4e91-bf33-a62dd709ccd7	URLEntropy	-0.4113044659887882	url
54d377e9-bc27-4cb2-8935-b63889b09b52	61a10b3a-5792-4e91-bf33-a62dd709ccd7	URLLength	-2.263189536111186	url
5503ba05-d6be-41f5-80d2-f1259310f8de	5b2fdea7-0950-4499-b634-164a0e28fa7b	dom	0.1185209396044011	fusion_contribution
5ec23058-ccb3-47d6-a675-58cc6362ced5	5b2fdea7-0950-4499-b634-164a0e28fa7b	url	0.8814790603955989	fusion_contribution
1de764ce-ad30-4422-9406-9e845f03d7cb	5b2fdea7-0950-4499-b634-164a0e28fa7b	visual	0	fusion_contribution
3bac6035-614e-4b77-97a0-8b96358f7bdc	5b2fdea7-0950-4499-b634-164a0e28fa7b	DomainLength	-1.399241753360218	url
e121d1d2-5d12-4661-8548-c2160a85f441	5b2fdea7-0950-4499-b634-164a0e28fa7b	NoOfSubDomain	-0.7082312105056752	url
09a91208-fec3-49bc-ae1b-f5439a2cc2f7	5b2fdea7-0950-4499-b634-164a0e28fa7b	TLDLength	-0.4136865836134727	url
62b3c60c-9998-4300-9fdb-4258fd49c4a9	5b2fdea7-0950-4499-b634-164a0e28fa7b	URLEntropy	-0.4113044659887882	url
5596a73c-88f3-4bf3-9d56-d53d3458bbfc	5b2fdea7-0950-4499-b634-164a0e28fa7b	URLLength	-2.263189536111186	url
bb58cc18-53cc-4b27-b935-2ceca9cb7719	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	dom	0.1334182764355293	fusion_contribution
981ed6da-0c3b-422d-98c4-58c660de5788	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	url	0.8665817235644708	fusion_contribution
1f0b6335-fbd3-4e94-b9ea-12a0789de9e8	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	visual	0	fusion_contribution
82b7ab4d-438a-49d8-ade4-2a2da1b1e9bf	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	DomainLength	-1.399241753360218	url
c00de164-6af3-456b-b5b7-ee92a56a56e2	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	NoOfSubDomain	-0.7082312105056752	url
056420b9-2fc3-4207-a93a-b11f94559da0	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	TLDLength	-0.4136865836134727	url
bbbd298b-a03c-42aa-9886-af5f06d86ecf	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	URLEntropy	-0.4113044659887882	url
9f6142df-5480-46f8-98eb-b061fd9d70d4	9ebcaeb7-66e3-41aa-9fae-8d97c119a648	URLLength	-2.263189536111186	url
730a3e8e-2a74-404e-9c9b-0e1063976937	f4c5a196-282a-4278-818e-7ae4da996b8f	dom	0.1441686284122421	fusion_contribution
9f5de0ed-a5e4-4056-b519-bdd966b4c595	f4c5a196-282a-4278-818e-7ae4da996b8f	url	0.855831371587758	fusion_contribution
83a31066-1a91-49c3-87d2-ae00ee0dc65b	f4c5a196-282a-4278-818e-7ae4da996b8f	visual	0	fusion_contribution
14b3258d-6498-4cc7-b51e-c027c9d4f2ac	f4c5a196-282a-4278-818e-7ae4da996b8f	DomainLength	-1.399241753360218	url
76ff0061-51d2-4477-875a-b63e26f53bf3	f4c5a196-282a-4278-818e-7ae4da996b8f	NoOfSubDomain	-0.7082312105056752	url
d2b98c63-876c-40d4-a967-d49b366d39bd	f4c5a196-282a-4278-818e-7ae4da996b8f	TLDLength	-0.4136865836134727	url
bac272fb-54e8-496d-8db1-61be71493b8a	f4c5a196-282a-4278-818e-7ae4da996b8f	URLEntropy	-0.4113044659887882	url
c45b2bbc-222f-4ddd-9bfe-e69f562c2a85	f4c5a196-282a-4278-818e-7ae4da996b8f	URLLength	-2.263189536111186	url
22ac42eb-80f9-4156-b135-0e17138b6020	bf7eafb7-0606-4d92-b9c4-cf4244320281	dom	0.1441686284122421	fusion_contribution
80c0247f-29f2-4c21-9055-8f60ee0a0c6d	bf7eafb7-0606-4d92-b9c4-cf4244320281	url	0.855831371587758	fusion_contribution
d1b61461-0767-42ea-88e8-346e8fc09bd2	bf7eafb7-0606-4d92-b9c4-cf4244320281	visual	0	fusion_contribution
7713d84b-f83c-4dd1-b64a-53fa6cde5bb4	bf7eafb7-0606-4d92-b9c4-cf4244320281	DomainLength	-1.399241753360218	url
00312fa9-ac6c-451b-bdb5-d72a1f806ffe	bf7eafb7-0606-4d92-b9c4-cf4244320281	NoOfSubDomain	-0.7082312105056752	url
a7c868c0-34b9-4687-b094-3580233b8786	bf7eafb7-0606-4d92-b9c4-cf4244320281	TLDLength	-0.4136865836134727	url
59f9ff19-2805-46ef-9b99-8ea548b8f9d2	bf7eafb7-0606-4d92-b9c4-cf4244320281	URLEntropy	-0.4113044659887882	url
cd41d8d7-b984-4089-a608-c959ca98b441	bf7eafb7-0606-4d92-b9c4-cf4244320281	URLLength	-2.263189536111186	url
f40c5d16-e66a-48fc-b994-1c3100d8e555	da914dc9-f196-4a54-8e88-244f03c895c8	dom	0.2024872056762914	fusion_contribution
059484c3-48b6-46dd-8244-c4a7b1c68dba	da914dc9-f196-4a54-8e88-244f03c895c8	url	0.7975127943237086	fusion_contribution
7b4e730f-75e8-4afe-984b-c05c342baef8	da914dc9-f196-4a54-8e88-244f03c895c8	visual	0	fusion_contribution
fc1d9a2c-1083-45ae-82df-f5074e998174	da914dc9-f196-4a54-8e88-244f03c895c8	DomainDigitRatio	3.102301270247489	url
1c7b9836-b3c8-4890-b55e-e573a84066d5	da914dc9-f196-4a54-8e88-244f03c895c8	DomainLength	1.779147125983572	url
42bcf66e-219d-41a6-b966-dd2e45084c1e	da914dc9-f196-4a54-8e88-244f03c895c8	MaxDigitRunLength	2.586862355390605	url
bad011b2-2c22-4569-a4b9-f22caf6a1bdd	da914dc9-f196-4a54-8e88-244f03c895c8	NoOfSubDomain	0.9473383364708123	url
46bff7d7-8daa-4883-9712-a617dc5dc2d1	da914dc9-f196-4a54-8e88-244f03c895c8	URLLength	1.787445391438626	url
800e7374-b743-4819-be41-1702d8e16c42	07dff763-a952-438f-88e8-eec865052bf1	dom	0.7719164771397994	fusion_contribution
d543a15d-ca62-494d-a57f-814394f9cecf	07dff763-a952-438f-88e8-eec865052bf1	url	0.2280835228602006	fusion_contribution
bd505cc1-4560-4b93-82ad-fb47782980ba	07dff763-a952-438f-88e8-eec865052bf1	visual	0	fusion_contribution
57ff7242-5a58-452d-b965-259263a73704	07dff763-a952-438f-88e8-eec865052bf1	DomainDigitRatio	-0.6521024185155821	url
b4278858-e859-440c-beae-80e2f16d8b8f	07dff763-a952-438f-88e8-eec865052bf1	DomainHyphenCount	-0.2730317698382912	url
82b43228-d05b-424f-9821-3fa935835ac6	07dff763-a952-438f-88e8-eec865052bf1	DomainLength	-0.6161710676002665	url
af0f8ab9-1766-4b0b-a601-38b1f10d53e2	07dff763-a952-438f-88e8-eec865052bf1	NoOfSubDomain	2.771154667421341	url
192beec4-a381-4c2b-a43d-ebe94bd45404	07dff763-a952-438f-88e8-eec865052bf1	URLLength	-0.8939771714023439	url
5e2c398c-9e91-4fa5-af60-ef1f27d02138	3b428085-df67-4c58-bcfb-3d88d4456462	dom	0.1291433323081777	fusion_contribution
803de9f4-7360-4b6e-8634-e67cf3e5894f	3b428085-df67-4c58-bcfb-3d88d4456462	url	0.8708566676918224	fusion_contribution
ae0dae06-a377-4041-9a92-b21a10108a22	3b428085-df67-4c58-bcfb-3d88d4456462	visual	0	fusion_contribution
14562763-1b60-4382-9640-1dfeaaa98c10	3b428085-df67-4c58-bcfb-3d88d4456462	DomainDigitRatio	-0.2718877333153419	url
d323aa3b-76e9-45bb-b96c-685d08bedb20	3b428085-df67-4c58-bcfb-3d88d4456462	DomainLength	-2.103251975638066	url
abe21be8-7c54-4822-b39d-f55f34577175	3b428085-df67-4c58-bcfb-3d88d4456462	NoOfSubDomain	-0.7748282133182997	url
924693c0-e4b6-4464-962f-4483eef29044	3b428085-df67-4c58-bcfb-3d88d4456462	URLEntropy	-0.3003448441108639	url
c32b5c83-608d-4452-b694-8581b450ad94	3b428085-df67-4c58-bcfb-3d88d4456462	URLLength	-1.967370132797673	url
10fafb34-c5c3-40f0-880e-e1b3b4f4ff6c	133fcf48-7348-409e-a23b-8e15535dc2a8	dom	0.1469569819477207	fusion_contribution
94da8486-0227-4406-8580-30ae3edd6fc0	133fcf48-7348-409e-a23b-8e15535dc2a8	url	0.8530430180522793	fusion_contribution
1e0943c9-9d11-43de-85b1-71cf754702a8	133fcf48-7348-409e-a23b-8e15535dc2a8	visual	0	fusion_contribution
db969a01-2f1b-4229-b2e9-e0d24e922eaa	133fcf48-7348-409e-a23b-8e15535dc2a8	DomainDigitRatio	-0.3487611101128419	url
6556998c-6e8d-4461-ac86-258a10158fa8	133fcf48-7348-409e-a23b-8e15535dc2a8	DomainLength	3.20768296610601	url
48c2ab01-a346-4e9f-9e52-124f97ee060b	133fcf48-7348-409e-a23b-8e15535dc2a8	NoOfSubDomain	-0.5936983588063123	url
701319e4-9c16-425f-b110-3a66d2db7459	133fcf48-7348-409e-a23b-8e15535dc2a8	TLDLength	-0.8263579882756337	url
f5290bdb-02c4-404b-b3c0-2e03a76a636b	133fcf48-7348-409e-a23b-8e15535dc2a8	URLLength	9.115497341632176	url
08e1770d-553a-41a9-bbbe-dd4b53aacd0b	c07abecc-875e-44e4-84b0-73b3e2d9d04e	dom	0.1469569819477207	fusion_contribution
2d7d30b0-2202-4c93-b8cf-d999860f7a56	c07abecc-875e-44e4-84b0-73b3e2d9d04e	url	0.8530430180522793	fusion_contribution
a3c6536e-ca83-416b-90c0-851c02c3d156	c07abecc-875e-44e4-84b0-73b3e2d9d04e	visual	0	fusion_contribution
2afe3352-fca7-4850-b292-c1e5652e2784	c07abecc-875e-44e4-84b0-73b3e2d9d04e	DomainDigitRatio	-0.3487611101128419	url
8959c463-12be-4ffa-9697-2846fa538814	c07abecc-875e-44e4-84b0-73b3e2d9d04e	DomainLength	3.20768296610601	url
32288213-1d1e-4a6b-b731-a38280a9e725	c07abecc-875e-44e4-84b0-73b3e2d9d04e	NoOfSubDomain	-0.5936983588063123	url
ae4ebe24-fede-4c89-a8ce-78313f32efc8	c07abecc-875e-44e4-84b0-73b3e2d9d04e	TLDLength	-0.8263579882756337	url
0d8f0397-77e2-46ba-bca2-03e5ebc58906	c07abecc-875e-44e4-84b0-73b3e2d9d04e	URLLength	9.115497341632176	url
f10a6bfb-6a71-4c24-8f59-41652b33b0be	df336d21-4f4f-4489-9027-1c30aeb7d317	dom	0.1334432973854517	fusion_contribution
443a5fc1-b606-42e7-b54f-51c8ab17a7e4	df336d21-4f4f-4489-9027-1c30aeb7d317	url	0.8665567026145483	fusion_contribution
63745f10-a29a-4394-9564-a119d20517b4	df336d21-4f4f-4489-9027-1c30aeb7d317	visual	0	fusion_contribution
ab69a1f2-86c1-4af2-bce6-c95e0300f21a	df336d21-4f4f-4489-9027-1c30aeb7d317	DomainLength	-1.399241753360218	url
ba114661-7a6e-4d5b-b49a-d4abbe7ca308	df336d21-4f4f-4489-9027-1c30aeb7d317	NoOfSubDomain	-0.7082312105056752	url
90409caf-114d-409e-9d38-91c25b74700a	df336d21-4f4f-4489-9027-1c30aeb7d317	TLDLength	-0.4136865836134727	url
14244e9f-c4cb-4074-ba4c-892aa7153a99	df336d21-4f4f-4489-9027-1c30aeb7d317	URLEntropy	-0.4113044659887882	url
cb981639-7f85-478f-859b-255c4c6d4312	df336d21-4f4f-4489-9027-1c30aeb7d317	URLLength	-2.263189536111186	url
7a1a6f6f-f3bb-4f11-9657-88c19178522a	1990dc06-ac23-490b-bac5-37f692d02bb1	dom	0.4537871526502476	fusion_contribution
727069b7-48c5-4e06-9b85-77a129641c92	1990dc06-ac23-490b-bac5-37f692d02bb1	url	0.5462128473497524	fusion_contribution
aa3522a6-7fe2-4d3a-a9da-2135dc59fb47	1990dc06-ac23-490b-bac5-37f692d02bb1	visual	0	fusion_contribution
4f01827f-d7bd-4d75-9054-44e02e2fb237	1990dc06-ac23-490b-bac5-37f692d02bb1	DomainDigitRatio	-0.294706499524314	url
1c5ab3ad-bbee-4c48-8b93-8e6c18359089	1990dc06-ac23-490b-bac5-37f692d02bb1	DomainHyphenCount	-0.1407850735521232	url
7dcbbc7e-047a-4af4-99ea-405bc7ddd133	1990dc06-ac23-490b-bac5-37f692d02bb1	DomainLength	-1.36805033762506	url
785f3d8d-8505-45bf-b8fe-c51d97a00f65	1990dc06-ac23-490b-bac5-37f692d02bb1	NoOfSubDomain	-0.7421050645634977	url
1d649005-cbab-496f-b559-6c18a5a8aae2	1990dc06-ac23-490b-bac5-37f692d02bb1	URLLength	-2.07744742194279	url
\.


--
-- Data for Name: scans; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scans (id, user_id, url, status, created_at, is_deleted, deleted_at, deleted_by) FROM stdin;
c8e678ca-c2b9-4122-96fa-20cdc0d9aa86	0ad2d04a-0d38-4873-9277-d6933a89633b	https://honeyportdashboard.netlify.app	COMPLETED	2026-04-08 18:03:58.494	f	\N	\N
85ee8356-540d-432b-bb05-4743cf67cb2b	0ad2d04a-0d38-4873-9277-d6933a89633b	https://honeyportdashboard.netlify.app	COMPLETED	2026-04-08 18:05:09.924	f	\N	\N
c073fb5f-2ca0-4e3c-90b1-b82359efe4d7	\N	https://github.com	COMPLETED	2026-04-08 18:21:20.924	f	\N	\N
9d0cc67d-1daf-4748-bd92-3a1e8ca6130e	0ad2d04a-0d38-4873-9277-d6933a89633b	https://github.com	COMPLETED	2026-04-08 18:22:41.27	f	\N	\N
81c8ec04-bbf3-42d7-986f-7e993b0ff8b9	0ad2d04a-0d38-4873-9277-d6933a89633b	https://claude.ai/new	COMPLETED	2026-04-08 18:22:59.281	f	\N	\N
e950d6c6-62cc-40ba-80db-e43380d9f9b0	0ad2d04a-0d38-4873-9277-d6933a89633b	https://claude.ai	COMPLETED	2026-04-08 18:23:52.367	f	\N	\N
1d34fd21-5a97-4b4b-a350-0b0ce7b993b8	0ad2d04a-0d38-4873-9277-d6933a89633b	https://github.com/Syed-Asad-Abbas/Multimodal-Phishing-Detection-System/blob/main/SETUP.md	COMPLETED	2026-04-08 18:24:33.654	f	\N	\N
58f1f96a-db8c-4763-afa4-92a0d8688d19	0ad2d04a-0d38-4873-9277-d6933a89633b	http://rgipt.ac.in	COMPLETED	2026-04-08 18:34:18.073	f	\N	\N
734fadf6-f39d-49f9-bba0-1de8abd2a10a	0ad2d04a-0d38-4873-9277-d6933a89633b	http://www.crestonwood.com/router.php	COMPLETED	2026-04-08 18:34:45.101	f	\N	\N
f4c662e2-e3b2-436d-8aa4-3ed9841abe3c	0ad2d04a-0d38-4873-9277-d6933a89633b	http://shadetreetechnology.com/V4/validation/a111aedc8ae390eabcfa130e041a10a4	COMPLETED	2026-04-08 18:35:20.53	f	\N	\N
3f3d1dd5-59df-42be-a646-2cde64adc006	0ad2d04a-0d38-4873-9277-d6933a89633b	https://support-appleld.com.secureupdate.duilawyeryork.com/ap/89e6a3b4b063b8d/?cmd=_update&dispatch=...	COMPLETED	2026-04-08 18:35:53.214	f	\N	\N
44b54234-089c-4dd7-b52e-4e9003e1103e	0ad2d04a-0d38-4873-9277-d6933a89633b	http://appleid.apple.com-app.es/	PENDING	2026-04-08 18:36:17.228	f	\N	\N
b0fe5c4b-69da-46bb-8726-3e3a69538be2	0ad2d04a-0d38-4873-9277-d6933a89633b	http://appleid.apple.com-app.es/	PENDING	2026-04-08 18:37:26.907	f	\N	\N
40ed5f7a-7a67-4f92-9774-143172eb5229	0ad2d04a-0d38-4873-9277-d6933a89633b	http://appleid.apple.com-app.es/	PENDING	2026-04-08 18:39:14.317	f	\N	\N
12954439-a666-40da-9417-ce8468ad124b	0ad2d04a-0d38-4873-9277-d6933a89633b	http://appleid.apple.com-app.es/	PENDING	2026-04-08 18:39:52.344	f	\N	\N
265cd77b-5a09-49f5-a3de-27663fa783b8	0ad2d04a-0d38-4873-9277-d6933a89633b	http://appleid.apple.com-app.es/	PENDING	2026-04-08 18:43:04.359	f	\N	\N
271a767a-9fab-4e7c-b55b-13caf624f536	0ad2d04a-0d38-4873-9277-d6933a89633b	http://appleid.apple.com-app.es/	COMPLETED	2026-04-08 18:46:42.735	f	\N	\N
355e3cf9-65bd-49d7-856d-e980a406e289	0ad2d04a-0d38-4873-9277-d6933a89633b	http://www.mutuo.it	COMPLETED	2026-04-08 18:47:06.362	f	\N	\N
35ce566d-beff-4dc6-ad0f-607d26fdaad7	0ad2d04a-0d38-4873-9277-d6933a89633b	https://honeypotdashboard.netlify.app	COMPLETED	2026-04-09 07:09:46.145	f	\N	\N
3d7434db-0b64-4ace-9ed3-bed4acfa2c80	4335e9b2-e48c-49c3-9e17-b033d6acfd02	https://honypotdashboard.netlify.app	COMPLETED	2026-04-09 14:28:37.856	f	\N	\N
f303439e-3f10-4c84-b0ee-1d0fa3c8e0b9	4335e9b2-e48c-49c3-9e17-b033d6acfd02	http://00000000000000000update.emy.ba	COMPLETED	2026-04-09 14:31:56.322	f	\N	\N
1a3e9fab-58ef-4799-84ae-ec6ced008668	4335e9b2-e48c-49c3-9e17-b033d6acfd02	http://0000000000c0.x9xcax2a.workers.dev	COMPLETED	2026-04-09 14:32:16.581	f	\N	\N
4d689ccb-69f4-4df4-aa14-0f5449c8a899	\N	http://00000000000000000update.emy.ba	COMPLETED	2026-04-09 14:56:58.843	f	\N	\N
a7869702-7a5d-4d27-ae0f-d6da0b643950	\N	http://0000000000c0.x9xcax2a.workers.dev	COMPLETED	2026-04-09 14:57:25.004	f	\N	\N
051eb152-f2df-4856-a851-bfcdc694c932	c261e4fc-9ffa-497f-b498-24ff2b6a7370	http://0000000000c0.x9xcax2a.workers.dev	COMPLETED	2026-04-09 14:58:40.733	f	\N	\N
aba47ec9-47f9-4035-a815-a2c5abd61da7	c261e4fc-9ffa-497f-b498-24ff2b6a7370	http://0000000000c0.x9xcax2a.workers.dev	COMPLETED	2026-04-09 16:20:59.404	f	\N	\N
f0cf3016-92af-4f8c-b81e-360906841b28	c261e4fc-9ffa-497f-b498-24ff2b6a7370	https://bahria.edu.pk	COMPLETED	2026-04-24 17:00:09.426	f	\N	\N
ea41fb41-b781-4a2e-8939-0a2966eb3005	\N	https://bahria.edu.pk	COMPLETED	2026-04-24 17:28:52.31	f	\N	\N
c3a0ac6d-556e-4165-85a7-b4c5cae697b4	\N	https://bahria.edu.pk	PENDING	2026-04-24 19:51:02.158	f	\N	\N
963fc0a9-ad92-424d-802d-964a4e559f15	0ad2d04a-0d38-4873-9277-d6933a89633b	http://0.0.0ns6.cryptonight.net	COMPLETED	2026-04-25 20:25:04.069	f	\N	\N
bed454c8-22cd-4ce4-afef-151a37faca48	0ad2d04a-0d38-4873-9277-d6933a89633b	https://bahria.edu.pk	COMPLETED	2026-04-25 20:30:25.777	f	\N	\N
37dfdbcc-0f56-4ba5-8159-e097ebc81f39	0ad2d04a-0d38-4873-9277-d6933a89633b	https://www.youtube.com/shorts/uYsXI-stI7M	COMPLETED	2026-04-25 20:32:33.224	f	\N	\N
b52fd573-63e2-48c7-95e2-b5741f2a2934	0ad2d04a-0d38-4873-9277-d6933a89633b	https://www.youtube.com/shorts/	COMPLETED	2026-04-25 20:33:36.652	f	\N	\N
42942d5b-b43c-451c-a11c-b5f07695f2f4	0ad2d04a-0d38-4873-9277-d6933a89633b	https://www.youtube.com	COMPLETED	2026-04-25 20:34:14.899	f	\N	\N
23f950bd-2063-4a1e-a387-bd0697be2512	0ad2d04a-0d38-4873-9277-d6933a89633b	http://192.168.0.3:5001	COMPLETED	2026-04-25 20:37:19.229	f	\N	\N
e139e291-cdcb-49bc-a16b-5b958965545d	0ad2d04a-0d38-4873-9277-d6933a89633b	https://bahria.edu.pk	COMPLETED	2026-04-28 09:05:28.507	f	\N	\N
f81094ba-b498-4f08-bbb3-cc873ce91b5f	0ad2d04a-0d38-4873-9277-d6933a89633b	https://bahria.edu.pk	COMPLETED	2026-04-28 09:11:10.145	f	\N	\N
f3cbfa89-ce37-453e-a759-12d503243d08	0ad2d04a-0d38-4873-9277-d6933a89633b	https://youtube.com	COMPLETED	2026-04-28 11:31:24.695	f	\N	\N
5c36879e-1e8b-425f-9041-8004332f0028	0ad2d04a-0d38-4873-9277-d6933a89633b	https://bahria.edu.pk	COMPLETED	2026-04-28 11:32:20.193	f	\N	\N
814da5b4-f3d7-45b9-b060-b899ea3406f9	0ad2d04a-0d38-4873-9277-d6933a89633b	https://bahria.edu.pk	COMPLETED	2026-04-29 23:24:36.886	f	\N	\N
cdccfe92-b5c0-46c8-b1ac-45c8c7e70880	0ad2d04a-0d38-4873-9277-d6933a89633b	https://google.com	COMPLETED	2026-05-01 20:54:44.303	f	\N	\N
40aa6bce-4d5b-4064-866a-dc5fc9f8f8fa	\N	https://cms.bahria.edu.pk/Logins/Student/Login.aspx	COMPLETED	2026-05-03 22:10:13.055	f	\N	\N
7e82c38d-e7f2-4b92-a3b9-06657db16578	\N	https://cms.bahria.edu.pk/	COMPLETED	2026-05-03 22:12:38.044	f	\N	\N
86574963-f26b-4188-9fed-e31194a3313e	\N	https://bahria.edu.pk/	COMPLETED	2026-05-03 22:13:04.765	f	\N	\N
c2884a12-90b0-4301-a66c-ac44d2a46166	\N	https://bahria.edu.pk	COMPLETED	2026-05-03 22:13:39.289	f	\N	\N
e3f2f417-bfd3-4774-8fcb-02be92501c1f	0ad2d04a-0d38-4873-9277-d6933a89633b	https://www.youtube.com/watch?v=t21iYU17wmg	COMPLETED	2026-05-03 22:18:12.936	f	\N	\N
db444174-6283-4e57-b828-8b22d3ae2240	\N	https://www.youtube.com/watch?v=t21iYU17wmg	COMPLETED	2026-05-03 22:53:48.914	f	\N	\N
646e46c3-95cd-4872-9338-e82e99a762fa	\N	https://www.youtube.com/watch?v=SnZkiYVUNs0	COMPLETED	2026-05-03 23:03:07.159	f	\N	\N
eb1a302e-bb18-4a78-9abf-baac5c7857ec	c261e4fc-9ffa-497f-b498-24ff2b6a7370	https://bahria.edu.pk	COMPLETED	2026-05-03 23:06:45.269	f	\N	\N
0c24c0fb-2fe0-4637-b3cf-b4e4574558ca	c261e4fc-9ffa-497f-b498-24ff2b6a7370	https://bahria.edu.pk	COMPLETED	2026-05-03 23:10:08.701	f	\N	\N
b71b0eea-5afb-40de-9dc5-ef2ed057f410	c261e4fc-9ffa-497f-b498-24ff2b6a7370	https://bahria.edu.pk	PENDING	2026-05-03 23:13:26.039	f	\N	\N
a3c891c1-8d64-4370-9ee3-83dfc864db5c	c261e4fc-9ffa-497f-b498-24ff2b6a7370	https://bahria.edu.pk	COMPLETED	2026-05-03 23:13:35.089	f	\N	\N
a8a4e0c6-5eaa-4e9c-a802-b70374e021b9	\N	https://bahria.edu.pk	COMPLETED	2026-05-03 23:22:23.038	f	\N	\N
c91976f1-f2dd-4a47-b509-ab8c642bb403	\N	https://bahria.edu.pk	COMPLETED	2026-05-03 23:43:53.086	f	\N	\N
4882e423-9c4f-4c23-b8f2-f624f975c1a3	\N	https://bahria.edu.pk	COMPLETED	2026-05-03 23:45:23.637	f	\N	\N
297cb789-e928-4ec5-9542-3a1c0466f63e	\N	http://0000000000c0.x9xcax2a.workers.dev	COMPLETED	2026-05-03 23:46:27.809	f	\N	\N
581ca008-06ea-41f5-8bb7-5eea5a20af3e	\N	https://honeypotdashboard.netlify.app	COMPLETED	2026-05-03 23:47:36.738	f	\N	\N
b28820a9-f999-4c1f-9999-f8c1785ed30a	c261e4fc-9ffa-497f-b498-24ff2b6a7370	https://github.com	COMPLETED	2026-05-04 00:12:41.769	f	\N	\N
d7631a71-b418-4297-bcb2-2e1318a4622e	0ad2d04a-0d38-4873-9277-d6933a89633b	https://cms.bahria.edu.pk/Logins/Student/Login.aspx	COMPLETED	2026-05-04 19:47:21.348	f	\N	\N
5506cdbd-d1b6-404e-ad4e-d4874068e4f2	0ad2d04a-0d38-4873-9277-d6933a89633b	https://cms.bahria.edu.pk/Logins/Student/Login.aspx	COMPLETED	2026-05-04 19:48:51.473	f	\N	\N
87e4fbd2-7e28-44d9-bf87-031cec77786c	c261e4fc-9ffa-497f-b498-24ff2b6a7370	https://bahria.edu.pk/	COMPLETED	2026-05-05 02:14:36.257	f	\N	\N
8838dfd7-e5a2-424e-9eb1-03e32b30909e	c261e4fc-9ffa-497f-b498-24ff2b6a7370	https://chatgpt.com/	COMPLETED	2026-05-05 02:15:55.39	f	\N	\N
\.


--
-- Data for Name: testimonials; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.testimonials (id, review_id, published_at, display_text) FROM stdin;
f40579e0-8be4-4e60-a966-c229cf51ba22	a0168ad8-4df2-40a7-af46-3d77ecc38118	2026-04-09 07:36:20.648	it is wonderful
6a194e7d-e99d-4cde-8afa-5ba29b237704	728f3162-8750-458a-8666-4d7c55b4bc06	2026-04-09 16:25:01.534	it works like charm
dd50982a-e883-4972-9c62-dbfc57b74b1b	84517f99-cb4c-426d-8f92-eb9a517cd7eb	2026-05-04 00:33:30.8	This is a Good Product 
816ec557-46c8-4585-825f-e76038094e0f	610a19b2-35f8-4e62-9a53-61fcc154aeb5	2026-05-04 00:33:31.945	There Products works like a charm !
\.


--
-- Data for Name: pipeline_health_logs; Type: TABLE DATA; Schema: mlops; Owner: postgres
--

COPY mlops.pipeline_health_logs (id, service_name, status, latency_ms, error_details, "timestamp") FROM stdin;
1076c2c1-cb9e-4426-9457-a2b4dd10bd56	retraining_pipeline	healthy	1200	\N	2026-04-09 07:52:06.963
9f909832-fb0a-43b5-8ff9-44382c226d65	retraining_pipeline	healthy	1200	\N	2026-04-28 11:50:20.816
8d51ccf1-d7e8-44b6-a299-1d7dddc694b0	retraining_pipeline	healthy	1200	\N	2026-04-28 11:50:29.184
\.


--
-- Data for Name: retraining_jobs; Type: TABLE DATA; Schema: mlops; Owner: postgres
--

COPY mlops.retraining_jobs (id, triggered_by, start_time, end_time, status, metrics_summary) FROM stdin;
565241ce-e50f-4d8e-98a3-86e174b38163	0ad2d04a-0d38-4873-9277-d6933a89633b	2026-04-09 07:52:01.914	2026-04-09 07:52:06.961	completed	{"accuracy":0.98,"f1":0.97}
1d4cb257-2d7c-425f-ab62-ef5d18396dad	0ad2d04a-0d38-4873-9277-d6933a89633b	2026-04-28 11:50:15.796	2026-04-28 11:50:20.814	completed	{"accuracy":0.98,"f1":0.97}
fc2c0393-f480-473b-9b78-0f59bc513613	0ad2d04a-0d38-4873-9277-d6933a89633b	2026-04-28 11:50:24.176	2026-04-28 11:50:29.183	completed	{"accuracy":0.98,"f1":0.97}
\.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: admin; Owner: postgres
--

ALTER TABLE ONLY admin.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: daily_scan_stats daily_scan_stats_pkey; Type: CONSTRAINT; Schema: analytics; Owner: postgres
--

ALTER TABLE ONLY analytics.daily_scan_stats
    ADD CONSTRAINT daily_scan_stats_pkey PRIMARY KEY (id);


--
-- Name: model_metrics_daily model_metrics_daily_pkey; Type: CONSTRAINT; Schema: analytics; Owner: postgres
--

ALTER TABLE ONLY analytics.model_metrics_daily
    ADD CONSTRAINT model_metrics_daily_pkey PRIMARY KEY (id);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: two_factor_tokens two_factor_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.two_factor_tokens
    ADD CONSTRAINT two_factor_tokens_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: malicious_ip_observations malicious_ip_observations_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.malicious_ip_observations
    ADD CONSTRAINT malicious_ip_observations_pkey PRIMARY KEY (id);


--
-- Name: queued_jobs queued_jobs_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.queued_jobs
    ADD CONSTRAINT queued_jobs_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: scan_explanations scan_explanations_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scan_explanations
    ADD CONSTRAINT scan_explanations_pkey PRIMARY KEY (id);


--
-- Name: scan_results scan_results_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scan_results
    ADD CONSTRAINT scan_results_pkey PRIMARY KEY (id);


--
-- Name: scan_screenshots scan_screenshots_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scan_screenshots
    ADD CONSTRAINT scan_screenshots_pkey PRIMARY KEY (id);


--
-- Name: scan_shap_values scan_shap_values_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scan_shap_values
    ADD CONSTRAINT scan_shap_values_pkey PRIMARY KEY (id);


--
-- Name: scans scans_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scans
    ADD CONSTRAINT scans_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: pipeline_health_logs pipeline_health_logs_pkey; Type: CONSTRAINT; Schema: mlops; Owner: postgres
--

ALTER TABLE ONLY mlops.pipeline_health_logs
    ADD CONSTRAINT pipeline_health_logs_pkey PRIMARY KEY (id);


--
-- Name: retraining_jobs retraining_jobs_pkey; Type: CONSTRAINT; Schema: mlops; Owner: postgres
--

ALTER TABLE ONLY mlops.retraining_jobs
    ADD CONSTRAINT retraining_jobs_pkey PRIMARY KEY (id);


--
-- Name: daily_scan_stats_date_key; Type: INDEX; Schema: analytics; Owner: postgres
--

CREATE UNIQUE INDEX daily_scan_stats_date_key ON analytics.daily_scan_stats USING btree (date);


--
-- Name: model_metrics_daily_date_key; Type: INDEX; Schema: analytics; Owner: postgres
--

CREATE UNIQUE INDEX model_metrics_daily_date_key ON analytics.model_metrics_daily USING btree (date);


--
-- Name: users_email_key; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON auth.users USING btree (email);


--
-- Name: users_google_id_key; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE UNIQUE INDEX users_google_id_key ON auth.users USING btree (google_id);


--
-- Name: malicious_ip_observations_scan_id_key; Type: INDEX; Schema: core; Owner: postgres
--

CREATE UNIQUE INDEX malicious_ip_observations_scan_id_key ON core.malicious_ip_observations USING btree (scan_id);


--
-- Name: scan_explanations_scan_result_id_key; Type: INDEX; Schema: core; Owner: postgres
--

CREATE UNIQUE INDEX scan_explanations_scan_result_id_key ON core.scan_explanations USING btree (scan_result_id);


--
-- Name: scan_results_scan_id_key; Type: INDEX; Schema: core; Owner: postgres
--

CREATE UNIQUE INDEX scan_results_scan_id_key ON core.scan_results USING btree (scan_id);


--
-- Name: scan_screenshots_scan_result_id_key; Type: INDEX; Schema: core; Owner: postgres
--

CREATE UNIQUE INDEX scan_screenshots_scan_result_id_key ON core.scan_screenshots USING btree (scan_result_id);


--
-- Name: testimonials_review_id_key; Type: INDEX; Schema: core; Owner: postgres
--

CREATE UNIQUE INDEX testimonials_review_id_key ON core.testimonials USING btree (review_id);


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: two_factor_tokens two_factor_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.two_factor_tokens
    ADD CONSTRAINT two_factor_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: malicious_ip_observations malicious_ip_observations_scan_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.malicious_ip_observations
    ADD CONSTRAINT malicious_ip_observations_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES core.scans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scan_explanations scan_explanations_scan_result_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scan_explanations
    ADD CONSTRAINT scan_explanations_scan_result_id_fkey FOREIGN KEY (scan_result_id) REFERENCES core.scan_results(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scan_results scan_results_scan_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scan_results
    ADD CONSTRAINT scan_results_scan_id_fkey FOREIGN KEY (scan_id) REFERENCES core.scans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scan_screenshots scan_screenshots_scan_result_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scan_screenshots
    ADD CONSTRAINT scan_screenshots_scan_result_id_fkey FOREIGN KEY (scan_result_id) REFERENCES core.scan_results(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scan_shap_values scan_shap_values_scan_result_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scan_shap_values
    ADD CONSTRAINT scan_shap_values_scan_result_id_fkey FOREIGN KEY (scan_result_id) REFERENCES core.scan_results(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: scans scans_user_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.scans
    ADD CONSTRAINT scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: testimonials testimonials_review_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.testimonials
    ADD CONSTRAINT testimonials_review_id_fkey FOREIGN KEY (review_id) REFERENCES core.reviews(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict OmRvYZw3PBUuELX1LDY1aWHPQslfQ7MG2tWFt0bfNEsvRWDpp9CLygzTpNN6fKU

