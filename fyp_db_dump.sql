--
-- PostgreSQL database dump
--

\restrict Dhwk2OajXBcGRC9nf46tZB0rbFotbJz1yfsl2BfAeJvwLydf8x3dII7ZIiLzuz1

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
    email text NOT NULL,
    password_hash text NOT NULL,
    role auth."Role" DEFAULT 'USER'::auth."Role" NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    last_login timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_2fa_enabled boolean DEFAULT false NOT NULL,
    name text
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
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: admin; Owner: postgres
--

COPY admin.audit_logs (id, admin_id, action, entity_type, entity_id, details, created_at) FROM stdin;
091b348c-e68a-47dc-aab6-da70b44d38b7	d7cbd536-d33a-49b1-bc85-9b56b031568c	DELETE_SCAN	SCAN	51c20920-353c-4701-8e2e-ce7d5e61fcdc	Soft deleted scan for URL: http://delete-me.com	2026-01-28 18:45:21.626
d03194dc-af6c-4ab1-bef8-8a42235d0b7a	d7cbd536-d33a-49b1-bc85-9b56b031568c	CREATE_ADMIN	USER	936b4c21-d9ce-450d-b155-eac1c18b2dbd	Created new admin: admin_new@test.com	2026-01-28 18:47:40.441
d3a779ad-76ba-453f-bcee-20a998738b5c	d7cbd536-d33a-49b1-bc85-9b56b031568c	DELETE_SCAN	SCAN	24fc8681-9a6a-47dc-a22d-1c3f65178f81	Soft deleted scan for URL: http://delete-me.com	2026-01-28 19:22:58.066
4f76a22e-04b2-44a6-9719-bafda1fdc1ce	d7cbd536-d33a-49b1-bc85-9b56b031568c	CREATE_ADMIN	USER	eb1c2f0d-50eb-4d1d-89e4-9a9d251fdada	Created new admin: admin_new@test.com	2026-01-28 19:24:10.79
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
9fe6f4ba-04d6-44c1-a850-192bfa5b1ea5	94a2f6e8-6511-4556-898f-3b85bfe38038	4e9cdaaa8563e1d5b39d12094a026be36bc6ca8861ce509f12a1ac7335f6485c	2026-01-29 18:06:42.24
35c5d7b6-8e5f-4e36-8633-b2d2bc45c81c	d7cbd536-d33a-49b1-bc85-9b56b031568c	3450f66cb703d3c732de91f5ff62461bd5875e74698c1adc96aee782afb5c54c	2026-01-29 18:06:42.431
34c75979-9290-4092-8847-39cb29a0a1ec	5af0642b-cbaf-4d34-8cf2-a98f922658b8	53b957a285c6e95acc351b00d35b895fb2f8994e4e0b2b1840ff8265535400ab	2026-02-10 17:53:20.442
3ab61eb3-f063-4990-955a-181306cd88b6	e55d1072-4df0-41a2-8c6d-69cfead340d6	d27c71c40f2c2fa75f50b449f0585501d25ade07d199c1f6f27151e8fe2ee1ac	2026-02-10 17:54:59.375
ce257077-1166-4038-bd21-6dd377030e2c	ee898683-c173-4c78-bffd-cdf81b2c766d	8143976b0e1c229748e045548458939d578e9c3b3ff1f4db9c0cfae2f69f6281	2026-02-10 17:58:17.168
629a4fcd-8a4f-4b82-8018-3b2459063e98	2f0f043d-0621-4c6b-a71b-172d78679b77	8761b4267ba19079ed71ec430d67f770d1d2363d0d53f37fcca04466f75ef036	2026-02-10 23:00:18.081
6a0bd878-efa4-42c9-91fe-669c6bd8420c	b419c1d7-84a5-4eae-8de8-afaeeecfdcc4	97913e4e49bcf3341f3308b372feb3837a18a2f3b09bc9c2390356442cb5e590	2026-02-10 23:01:59.063
b71b52af-1b40-43e4-9b5b-69c105d7bf2e	90309ef5-cf75-42a0-9574-4ca176604802	c413b9020ea8d3f584281718bb12ecd44b13a10cbed616f2bb8cae6198494ae3	2026-02-10 23:07:23.927
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.password_reset_tokens (id, user_id, token_hash, expires_at) FROM stdin;
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
9090cb7e-e1fe-4883-9bed-15926f5744de	3a3c89d9-5ce0-4d99-b4d4-e628d1a49382	9089bebcf6f713223a63de03a3da4e6820fff6d58970888278bf0feb2c1b8a5c	2026-02-04 17:57:04.833	2026-01-28 17:57:04.834	::1	axios/1.13.4
f6bc1362-5c7d-4e06-8c09-ada097694777	3a3c89d9-5ce0-4d99-b4d4-e628d1a49382	3382a963093db532f64daca63af1ea829b0da097d81bdb176a85c0e2a8246049	2026-02-04 17:57:05.104	2026-01-28 17:57:05.106	::1	axios/1.13.4
b03c1971-b53a-4320-8f53-bd7e0e309706	3a3c89d9-5ce0-4d99-b4d4-e628d1a49382	28a4e701b1c5cfcd088b7952dbb8e9ecd2ac022f3c7a263f019dd6fa2bff0890	2026-02-04 17:57:05.289	2026-01-28 17:57:05.291	::1	axios/1.13.4
7f78f879-24f9-43ce-a2dc-6d0c840e02be	94a2f6e8-6511-4556-898f-3b85bfe38038	bac219cf8ccaa2149e662fd2b28383d34de1c84612caed766ce4f3674647b829	2026-02-04 18:06:42.343	2026-01-28 18:06:42.344	::1	axios/1.13.4
5eacdd40-4498-499c-a3d5-f5416f624e03	d7cbd536-d33a-49b1-bc85-9b56b031568c	a02c7a7cb8ed154de49eb172994de0767bd48c36e30bfb594f4ae0e83451c6dd	2026-02-04 18:06:42.6	2026-01-28 18:06:42.601	::1	axios/1.13.4
155ddeb2-4717-4ea3-b634-7da71484c7d8	d7cbd536-d33a-49b1-bc85-9b56b031568c	b799be91a91004b178f005845e419df9cdc62a1a19904ee56fbe255bf20ea576	2026-02-04 18:45:21.501	2026-01-28 18:45:21.503	::1	axios/1.13.4
cf8441bc-1cb4-40b3-9678-9b77605bb452	d7cbd536-d33a-49b1-bc85-9b56b031568c	d16ced71c5dd8cb82614ef6ce3cf818b07c2c1ce1120b9a4927933f42a1a3d65	2026-02-04 18:47:40.241	2026-01-28 18:47:40.242	::1	axios/1.13.4
d6a3ea6a-5976-4b50-849b-57d612edd823	d7cbd536-d33a-49b1-bc85-9b56b031568c	da91493f9f539382d858f594a7c5cc72ce90928256bae0bebb45382292fb0a8e	2026-02-04 18:49:02.476	2026-01-28 18:49:02.478	::1	axios/1.13.4
3ae13068-49f7-40cf-a9a3-6ef7425ab220	d7cbd536-d33a-49b1-bc85-9b56b031568c	b87196d530b3eda0d40cc0de0bb378c61f6a488193dd4c9d979ef0b4ae1510e3	2026-02-04 18:50:45.855	2026-01-28 18:50:45.856	::1	axios/1.13.4
167180de-116a-407c-91a8-cc4dbc296168	d7cbd536-d33a-49b1-bc85-9b56b031568c	127a682f8e38b389aff5557a244e25bf599987188c320a1d22dd67a9e80ea905	2026-02-04 18:52:21.069	2026-01-28 18:52:21.07	::1	axios/1.13.4
009121bf-4e0a-4bc2-824e-758963255941	d7cbd536-d33a-49b1-bc85-9b56b031568c	4626f765728a5fad046f60584bff37a9a5c95883681af1b01f7fa12d4b02e670	2026-02-04 18:52:54.895	2026-01-28 18:52:54.896	::1	axios/1.13.4
5950994c-6148-42b2-8da5-da1959889ca6	d7cbd536-d33a-49b1-bc85-9b56b031568c	31820f8d2ed6def5ea5d400ace802efe506a07af68875523564a883ce86eb409	2026-02-04 18:58:26.646	2026-01-28 18:58:26.648	::1	axios/1.13.4
72c2b9b0-da8c-43b4-a6c9-d52e52fcb1a2	9a6718d5-4f2d-4fe7-8062-4b987a113d94	7459bed0d732e000fd277c91c7b8f54d3505834e0e74921c85c054487fcc8dfd	2026-02-04 19:22:31.491	2026-01-28 19:22:31.492	::1	axios/1.13.4
b0e0d176-86f3-4007-9b0f-10528b6570d0	9a6718d5-4f2d-4fe7-8062-4b987a113d94	43af364542e6f78e98014898c387946286f30009e9fd00d1442a27311fa25bfc	2026-02-04 19:22:31.759	2026-01-28 19:22:31.76	::1	axios/1.13.4
e6792ae8-9a7b-4ac2-b6cb-c392877c3eb9	9a6718d5-4f2d-4fe7-8062-4b987a113d94	dea8026c44f974cbf10a47a5ca6d28a95aa3dbda018d14bc32e9cc06535cd83d	2026-02-04 19:22:31.926	2026-01-28 19:22:31.927	::1	axios/1.13.4
e973f257-890d-4590-bee5-6484706468c3	94a2f6e8-6511-4556-898f-3b85bfe38038	5ad3eceb9e837870fcd18966a27ded7a14fd84e7bec932e9c004819ce728b27b	2026-02-04 19:22:49.491	2026-01-28 19:22:49.492	::1	axios/1.13.4
fa974105-29a3-426a-b77e-76a9db511bea	d7cbd536-d33a-49b1-bc85-9b56b031568c	da012f760809d885abb393b2ee8a52dba1817ddeb77060d729a03c6e275522ec	2026-02-04 19:22:49.634	2026-01-28 19:22:49.635	::1	axios/1.13.4
e2486fb5-f769-4f5f-b313-560b7eef71fc	d7cbd536-d33a-49b1-bc85-9b56b031568c	f92a93736c4058e10e03a0c6a19fa46a5ad68bf68e5663d80ceac07cabe9ecd3	2026-02-04 19:22:58.002	2026-01-28 19:22:58.003	::1	axios/1.13.4
f6b62cc1-3946-414e-a9c9-8ed6dceef31c	d7cbd536-d33a-49b1-bc85-9b56b031568c	b5dab012dddd53663a12e74bd7391eec99e788e82118fb514acf07b3b383df02	2026-02-04 19:23:07.935	2026-01-28 19:23:07.936	::1	axios/1.13.4
774aa4d2-6a31-4fec-8a6a-9bc3c187f8ff	d7cbd536-d33a-49b1-bc85-9b56b031568c	8054fb7b2b38bdcff440d65015fdc727af307383cd65b398dfacec28b26ad739	2026-02-04 19:24:10.629	2026-01-28 19:24:10.631	::1	axios/1.13.4
7e11de6d-ac71-4aae-ba6e-3a8c6786c429	eb1c2f0d-50eb-4d1d-89e4-9a9d251fdada	3ac6cb2a226107b13a197eb179c8c4d3d325d8a67f6e29802d1412db97b516e3	2026-02-04 19:24:10.878	2026-01-28 19:24:10.88	::1	axios/1.13.4
82ab7f06-3088-4209-b3dc-06e049d8a0f4	5af0642b-cbaf-4d34-8cf2-a98f922658b8	7734fa862b3ad7639235e05f159c37b580f52d5b9ba44ec35651f4b9ed620886	2026-02-16 17:53:20.592	2026-02-09 17:53:20.596	127.0.0.1	axios/1.13.5
feddc83c-634d-429c-8969-7157f982ff5f	e55d1072-4df0-41a2-8c6d-69cfead340d6	273ef8f911a2fe69276197d02558e517817e30bd86d36a188dead5c825563673	2026-02-16 17:54:59.509	2026-02-09 17:54:59.51	127.0.0.1	axios/1.13.5
4676807a-b443-4235-b944-724ba50c4092	ee898683-c173-4c78-bffd-cdf81b2c766d	c7b400eea96820f565270ae40830c41645d0297284850bfa4b8d7a98e87e6858	2026-02-16 17:58:17.323	2026-02-09 17:58:17.326	127.0.0.1	axios/1.13.5
03b4361d-e47d-48b4-9ffe-bad2c2701071	2f0f043d-0621-4c6b-a71b-172d78679b77	75c019744a04e0ce420e9f5466c17b5542e9a3d4e075c1c069d5d3ec2b2aa1dc	2026-02-16 23:00:18.236	2026-02-09 23:00:18.237	127.0.0.1	axios/1.13.5
e29d163a-1fea-4835-bd6b-87e10a9612e5	b419c1d7-84a5-4eae-8de8-afaeeecfdcc4	867a3fc194d93923245d1f2a78795998bdd94e947ef17a567926fda5459b3c82	2026-02-16 23:02:06.449	2026-02-09 23:02:06.45	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
00474b6d-6021-479f-9292-2fb2bb68c3b4	90309ef5-cf75-42a0-9574-4ca176604802	75bef0c052bdb6ea23e6bbb7a9386e500200e324f3bb0c4df0b62cf906344cef	2026-02-16 23:07:24.073	2026-02-09 23:07:24.075	127.0.0.1	axios/1.13.5
32324423-812f-4265-b3dd-dbe8147b041f	b419c1d7-84a5-4eae-8de8-afaeeecfdcc4	5fb00420bd14cee12e8ae44ccb77a976d603ceb8f732b59e5f2498d4901dda6c	2026-02-16 23:13:14.531	2026-02-09 23:13:14.535	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.users (id, email, password_hash, role, is_verified, last_login, created_at, updated_at, is_2fa_enabled, name) FROM stdin;
e55d1072-4df0-41a2-8c6d-69cfead340d6	auto_test_1770659699187@example.com	$2b$10$ZfW7/HKJQNcU9/muLSbHKuOA70uRnS.bE5Z5fGIRbs114r4GruZwG	USER	f	2026-02-09 17:54:59.499	2026-02-09 17:54:59.364	2026-02-09 17:54:59.5	f	\N
ee898683-c173-4c78-bffd-cdf81b2c766d	auto_test_1770659896983@example.com	$2b$10$pTCKewBLtkBkozsrOzXuxOxjrjNkEQFje5mOrd2IMvDPSQ6jqAf1m	USER	f	2026-02-09 17:58:17.307	2026-02-09 17:58:17.161	2026-02-09 17:58:17.31	f	\N
3a3c89d9-5ce0-4d99-b4d4-e628d1a49382	test_1769623024474@example.com	$2b$10$.l6uESIaXRz87Ki3TlhARusI8MUKeV9Ne4FJfgU34y7O9Z4GW0rfG	USER	t	2026-01-28 17:57:05.283	2026-01-28 17:57:04.696	2026-01-28 17:57:05.285	t	\N
2f0f043d-0621-4c6b-a71b-172d78679b77	auto_test_1770678017765@example.com	$2b$10$DwQ9m72CjbqO63Uq.dEmCenNWjbHeQ.DL.8qcqvXZrrAKmMNv7L1a	USER	f	2026-02-09 23:00:18.212	2026-02-09 23:00:18.061	2026-02-09 23:00:18.213	f	Auto Tester
90309ef5-cf75-42a0-9574-4ca176604802	auto_test_1770678443433@example.com	$2b$10$GzNxstSxwVNyteM7XQ5Zr.bDAi8HZjEdgQy8jExirtXPPZ3/cPioi	USER	f	2026-02-09 23:07:24.058	2026-02-09 23:07:23.907	2026-02-09 23:07:24.06	f	Auto Tester
b419c1d7-84a5-4eae-8de8-afaeeecfdcc4	lawlite.2005@gmail.com	$2b$10$H3M8n3z3IkrrFOmWyIC2yO3hs78a5r8aoZ.b7ej4Mzwn3zaqICZGm	USER	f	2026-02-09 23:13:14.423	2026-02-09 23:01:59.051	2026-02-09 23:13:14.433	f	asad
9a6718d5-4f2d-4fe7-8062-4b987a113d94	test_1769628151168@example.com	$2b$10$CJIjzRuk4g1CyZQdAoCIHOwsawjWA1UNPJ5G4AgS6iz146Itefojm	USER	t	2026-01-28 19:22:31.924	2026-01-28 19:22:31.361	2026-01-28 19:22:31.925	t	\N
94a2f6e8-6511-4556-898f-3b85bfe38038	user_test@test.com	$2b$10$45fUeFKzShGzf/HrOhiqN.biEC7a96gfN28BzZvYIPfEwJDDYtDku	USER	f	2026-01-28 19:22:49.487	2026-01-28 18:06:42.232	2026-01-28 19:22:49.488	f	\N
d7cbd536-d33a-49b1-bc85-9b56b031568c	admin_test@test.com	$2b$10$NjIMatfLZurxw5IHhGHStOX5YSjnJwCJCuHphoBKoQ0rKPG8QUZVC	ADMIN	f	2026-01-28 19:24:10.626	2026-01-28 18:06:42.429	2026-01-28 19:24:10.628	f	\N
eb1c2f0d-50eb-4d1d-89e4-9a9d251fdada	admin_new@test.com	$2b$10$m6L7rmb7/xhsPkPKTMUt6u/7lmRAorUDSjQv6mz/YPsnJgUT53L1O	ADMIN	t	2026-01-28 19:24:10.875	2026-01-28 19:24:10.787	2026-01-28 19:24:10.876	f	\N
5af0642b-cbaf-4d34-8cf2-a98f922658b8	auto_test_1770659600090@example.com	$2b$10$cPVWpxh66GFAoXQpQ2S31OJ4Hs8DgsJk3beOGv6vO220BEsGr7dyW	USER	f	2026-02-09 17:53:20.562	2026-02-09 17:53:20.408	2026-02-09 17:53:20.566	f	\N
\.


--
-- Data for Name: malicious_ip_observations; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.malicious_ip_observations (id, scan_id, ip_address, geo_lat, geo_long, country, "timestamp") FROM stdin;
1d2fe9fe-22bb-4e2a-9b90-3160f565bfe1	eea57ee0-1359-48fe-93ba-00704fb03978	192.168.1.1	33.6	73	Pakistan	2026-01-28 18:03:16.844
4ed5cdbf-6710-4da6-aa7a-db35e5eebbbd	d484639c-b879-40a6-b06e-f0e700bb1a2e	192.168.1.1	33.6	73	Pakistan	2026-01-28 19:06:18.773
be5d7817-616f-4d5c-bc62-bd2662ef41e8	18e5cb5e-c45c-49e9-952b-fe328789711f	192.168.1.1	33.6	73	Pakistan	2026-01-28 19:22:41.348
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.reviews (id, user_id, rating, comment, status, created_at) FROM stdin;
533cb00c-01d5-40a9-a86b-e656eab894be	94a2f6e8-6511-4556-898f-3b85bfe38038	5	Great system! Caught a phish.	APPROVED	2026-01-28 18:06:42.608
d4cce114-0a83-405a-bbc4-dd445c690e09	94a2f6e8-6511-4556-898f-3b85bfe38038	5	Great system! Caught a phish.	APPROVED	2026-01-28 19:22:49.643
\.


--
-- Data for Name: scan_explanations; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scan_explanations (id, scan_result_id, llm_text) FROM stdin;
12c9149f-ef28-4dcb-8bfc-e51cc2d617fb	f05d76c3-cca1-4fc1-ac04-cde347892131	This is a mock LLM explanation. The URL looks suspicious due to length.
aeafc7dc-d666-4c5a-b0e3-ae4a52103d88	03d5cc84-442b-4497-b37b-abe0ac3577c1	This is a mock LLM explanation. The URL looks suspicious due to length.
8fe3161e-6fd3-435a-b892-481a8c6e9865	83073ff1-fba3-4ad7-98bb-d320a8fcdcae	This is a mock LLM explanation. The URL looks suspicious due to length.
23eb7566-75b2-40af-aa52-fb02c364f671	952b6d5a-b939-4e53-8818-06c23ce81640	This is a mock LLM explanation. The URL looks suspicious due to length.
efe0e712-2844-4962-be5a-76e77677fa81	e6746aca-cae2-4904-b18e-99cbc17c657e	This is a mock LLM explanation. The URL looks suspicious due to length.
e47e5ab4-fb08-4ed0-b0ac-383254a5a211	6d5ac3da-037d-4558-ad50-7579894cf0f3	Note: Gemini API Key not found. Please set GEMINI_API_KEY environment variable for detailed explanations.
41c94749-b334-4e81-9cfd-8c6ffdde592b	5e14866a-4827-48b2-ac34-d557dc341aec	Note: Gemini API Key not found. Please set GEMINI_API_KEY environment variable for detailed explanations.
802cedaf-5eec-463d-a624-ae397c38272a	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	Note: Gemini API Key not found. Please set GEMINI_API_KEY environment variable for detailed explanations.
3ddf8ba5-04b1-4371-87cb-d7439772ab98	7b3b88b2-f2e8-4606-b974-040240a6421b	This is a mock LLM explanation. The URL looks suspicious due to length.
80c8a676-ca72-403a-b771-d9615328d1bd	059ec7d4-90c0-482b-8737-344a07df87c8	This is a mock LLM explanation. The URL looks suspicious due to length.
3befb0df-ac47-40b2-8173-14045e4a00fc	a80f6003-eb1a-4dd7-8ac0-50ed55b8519a	This is a mock LLM explanation. The URL looks suspicious due to length.
\.


--
-- Data for Name: scan_results; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scan_results (id, scan_id, prediction, confidence_score, phishing_probability) FROM stdin;
f05d76c3-cca1-4fc1-ac04-cde347892131	eea57ee0-1359-48fe-93ba-00704fb03978	Phishing	0.95	95
03d5cc84-442b-4497-b37b-abe0ac3577c1	51c20920-353c-4701-8e2e-ce7d5e61fcdc	Benign	0.95	5
83073ff1-fba3-4ad7-98bb-d320a8fcdcae	d484639c-b879-40a6-b06e-f0e700bb1a2e	Phishing	0.95	95
952b6d5a-b939-4e53-8818-06c23ce81640	18e5cb5e-c45c-49e9-952b-fe328789711f	Phishing	0.95	95
e6746aca-cae2-4904-b18e-99cbc17c657e	24fc8681-9a6a-47dc-a22d-1c3f65178f81	Benign	0.95	5
6d5ac3da-037d-4558-ad50-7579894cf0f3	08fece33-795a-4c64-ba58-5ddc404bfbae	BENIGN	0.9998289669780477	0.0001710330219523252
5e14866a-4827-48b2-ac34-d557dc341aec	7a656c73-fbf0-4639-84b0-40efd183c348	BENIGN	0.9998289669780477	0.0001710330219523252
13569e48-de87-45b2-b8d7-48b1cb8ab2d0	f049a3ed-9587-4ad2-b7fe-37ec4bd1334c	BENIGN	0.9998289669780477	0.0001710330219523252
7b3b88b2-f2e8-4606-b974-040240a6421b	e61d0621-36f8-415c-b53e-fd6e20466974	Benign	0.95	5
059ec7d4-90c0-482b-8737-344a07df87c8	eaae622b-b532-4c1c-82fd-925246adb2eb	Benign	0.95	5
a80f6003-eb1a-4dd7-8ac0-50ed55b8519a	0d6e5113-ffd9-4918-b910-5dd44293a2dc	Benign	0.95	5
\.


--
-- Data for Name: scan_screenshots; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scan_screenshots (id, scan_result_id, image_url, base64_data) FROM stdin;
12dd9b2d-4350-41bd-a7e3-2ad875220ee0	f05d76c3-cca1-4fc1-ac04-cde347892131	https://via.placeholder.com/800x600?text=Screenshot+Mock	\N
98cc2fd7-6357-4eb3-afd7-0e2cc11cada0	03d5cc84-442b-4497-b37b-abe0ac3577c1	https://via.placeholder.com/800x600?text=Screenshot+Mock	\N
a4359a65-5552-499a-b4ea-b4070237902f	83073ff1-fba3-4ad7-98bb-d320a8fcdcae	https://via.placeholder.com/800x600?text=Screenshot+Mock	\N
144c365b-c9ed-4948-9fe1-9c8f54fbf02b	952b6d5a-b939-4e53-8818-06c23ce81640	https://via.placeholder.com/800x600?text=Screenshot+Mock	\N
46c49f94-30ff-4bc7-9f89-e246f6eb4405	e6746aca-cae2-4904-b18e-99cbc17c657e	https://via.placeholder.com/800x600?text=Screenshot+Mock	\N
4499af85-2238-4950-9c55-93fa43bb365e	7b3b88b2-f2e8-4606-b974-040240a6421b	https://via.placeholder.com/800x600?text=Screenshot+Mock	\N
32440a8e-c4ae-4242-8e11-b8b37481a15f	059ec7d4-90c0-482b-8737-344a07df87c8	https://via.placeholder.com/800x600?text=Screenshot+Mock	\N
3bb99139-38b1-4042-8962-55aad4bae859	a80f6003-eb1a-4dd7-8ac0-50ed55b8519a	https://via.placeholder.com/800x600?text=Screenshot+Mock	\N
\.


--
-- Data for Name: scan_shap_values; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scan_shap_values (id, scan_result_id, feature_name, shap_value, modality) FROM stdin;
6c3afcd7-2943-474d-9aaa-e5515aa41fa8	f05d76c3-cca1-4fc1-ac04-cde347892131	len_url	0.5	url
e917f21f-d68d-46d6-8448-8cfcb8d09548	f05d76c3-cca1-4fc1-ac04-cde347892131	has_https	-0.2	url
4b5237af-0c6c-4bb9-be38-339c6d0b6ce1	f05d76c3-cca1-4fc1-ac04-cde347892131	iframe_count	0.1	dom
c8607ce9-5956-4914-8cec-2991174fa920	f05d76c3-cca1-4fc1-ac04-cde347892131	logo_match	0	visual
c3dc3ccf-7412-43b8-9988-5463ef0433be	03d5cc84-442b-4497-b37b-abe0ac3577c1	len_url	0.5	url
787baeb5-747d-45ea-a562-774826efef34	03d5cc84-442b-4497-b37b-abe0ac3577c1	has_https	-0.2	url
07395640-304a-487b-91cb-9e9d2f7b27e3	03d5cc84-442b-4497-b37b-abe0ac3577c1	iframe_count	0.1	dom
a2436644-50dd-4ed8-b47b-dddc5bc9b02d	03d5cc84-442b-4497-b37b-abe0ac3577c1	logo_match	0	visual
496d6a4b-b8c4-4e5d-abf7-bbb0bf5651f8	83073ff1-fba3-4ad7-98bb-d320a8fcdcae	len_url	0.5	url
2c531c3d-c0fa-4269-bd4e-2485a0bce925	83073ff1-fba3-4ad7-98bb-d320a8fcdcae	has_https	-0.2	url
0047e50d-b799-45a4-917d-16726e08aa27	83073ff1-fba3-4ad7-98bb-d320a8fcdcae	iframe_count	0.1	dom
8e67bd8b-5dbf-4b96-8926-f406dd33ff63	83073ff1-fba3-4ad7-98bb-d320a8fcdcae	logo_match	0	visual
483200c3-fa32-4d2e-a892-24e1d47376ae	952b6d5a-b939-4e53-8818-06c23ce81640	len_url	0.5	url
7bf7e0d3-a387-466a-9357-0b9a8b6c726a	952b6d5a-b939-4e53-8818-06c23ce81640	has_https	-0.2	url
e34ec0b8-cb21-44b7-98d3-452f4fd1f88e	952b6d5a-b939-4e53-8818-06c23ce81640	iframe_count	0.1	dom
3e6db61a-6428-45a3-96cc-f59c5b2e5db9	952b6d5a-b939-4e53-8818-06c23ce81640	logo_match	0	visual
ee2e0cb5-f523-4e8b-ac0e-82ceaa676172	e6746aca-cae2-4904-b18e-99cbc17c657e	len_url	0.5	url
1464d976-4d98-4489-bc25-c0bb893a781e	e6746aca-cae2-4904-b18e-99cbc17c657e	has_https	-0.2	url
bab6dd1d-c89a-422d-91a0-53a6fe7dac15	e6746aca-cae2-4904-b18e-99cbc17c657e	iframe_count	0.1	dom
39580979-c2c8-48ed-aacf-a90a3be6c59f	e6746aca-cae2-4904-b18e-99cbc17c657e	logo_match	0	visual
0b12fe29-d646-4532-a039-397854dd4448	6d5ac3da-037d-4558-ad50-7579894cf0f3	dom	0.5569716934280583	fusion_contribution
76c866a5-e11e-458b-ab12-0ed11e6c970b	6d5ac3da-037d-4558-ad50-7579894cf0f3	url	0.4430283065719381	fusion_contribution
4cc80455-f1c5-40a1-b951-a441724acd28	6d5ac3da-037d-4558-ad50-7579894cf0f3	visual	3.673122585806575e-15	fusion_contribution
6b416a29-9fbc-416f-992a-34464c63bba1	6d5ac3da-037d-4558-ad50-7579894cf0f3	NoOfSubDomain	-10.74378418247981	url
8e187248-c7fb-4708-9d52-255ac6feab5a	6d5ac3da-037d-4558-ad50-7579894cf0f3	TLDLegitimateProb	-0.2806842381942576	url
114d8446-eb2c-4daf-bd03-fdfd311b064a	6d5ac3da-037d-4558-ad50-7579894cf0f3	URLCharProb	1.357363472140672	url
847779cd-b909-4865-91a0-7f27419a146e	6d5ac3da-037d-4558-ad50-7579894cf0f3	URLLength	-0.4435763485436366	url
7c716997-06dc-48a5-a156-aee6813ca9d9	6d5ac3da-037d-4558-ad50-7579894cf0f3	URLSimilarityIndex	6.869188771480924	url
cd71526e-3c7c-40d6-b3ea-6534c82bb20e	5e14866a-4827-48b2-ac34-d557dc341aec	dom	0.5569716934280583	fusion_contribution
c0df7070-c82e-4c1d-a596-0d51e0aa02cc	5e14866a-4827-48b2-ac34-d557dc341aec	url	0.4430283065719381	fusion_contribution
a22914bd-ec9b-4d21-a9aa-fd07e15a0ae6	5e14866a-4827-48b2-ac34-d557dc341aec	visual	3.673122585806575e-15	fusion_contribution
05508aa4-4e1d-494f-9a28-a9454855209d	5e14866a-4827-48b2-ac34-d557dc341aec	NoOfSubDomain	-10.74378418247981	url
48bbe9a7-2f58-4f7b-961c-6b7664cb7117	5e14866a-4827-48b2-ac34-d557dc341aec	TLDLegitimateProb	-0.2806842381942576	url
a5ca79f2-1a99-40ea-802d-d811608e2957	5e14866a-4827-48b2-ac34-d557dc341aec	URLCharProb	1.357363472140672	url
72a1a53f-ab2d-4c8e-ada5-51129961a7f1	5e14866a-4827-48b2-ac34-d557dc341aec	URLLength	-0.4435763485436366	url
dc87704e-cc39-4ab3-94b8-84ecddd44dff	5e14866a-4827-48b2-ac34-d557dc341aec	URLSimilarityIndex	6.869188771480924	url
aa322fe5-0ccd-4956-a749-da85c029d9b1	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	dom	0.5569716934280583	fusion_contribution
75a0e331-1772-4c99-938f-116a815d59bc	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	url	0.4430283065719381	fusion_contribution
c924258c-d8f2-4f25-b570-47814b128f61	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	visual	3.673122585806575e-15	fusion_contribution
27108103-c5e5-4ee0-9570-e746cd494100	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	DomainLength	0.528260432052327	url
e2d76b40-e908-4d2f-9fc5-4e728a0dbd9e	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	NoOfSubDomain	-10.34923964633868	url
d0282a65-8850-46a0-9bb2-99dbc7cb3a26	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	URLCharProb	0.8054756162931968	url
407d83f8-a922-4aa1-b071-cbc99b85c394	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	URLLength	-0.8447066251507228	url
0e64a919-557b-4e94-8fad-771156888051	13569e48-de87-45b2-b8d7-48b1cb8ab2d0	URLSimilarityIndex	6.886347313762086	url
0bf980f4-8688-4702-94a8-d8c575150ce7	7b3b88b2-f2e8-4606-b974-040240a6421b	len_url	0.5	url
0629ff01-8f5a-4959-9103-dce4ee3c6eb2	7b3b88b2-f2e8-4606-b974-040240a6421b	has_https	-0.2	url
1f43f7a3-0efe-4e57-a825-0dc669140e3d	7b3b88b2-f2e8-4606-b974-040240a6421b	iframe_count	0.1	dom
c231c074-b2c4-4ed6-9757-617ef7f245cf	7b3b88b2-f2e8-4606-b974-040240a6421b	logo_match	0	visual
d0fcd547-6b07-49ce-8d9b-be7dc160529f	059ec7d4-90c0-482b-8737-344a07df87c8	len_url	0.5	url
3237ce80-1f8d-4b14-8671-809ad56e8fe9	059ec7d4-90c0-482b-8737-344a07df87c8	has_https	-0.2	url
b9c8895e-40da-4491-b539-4cd42e705904	059ec7d4-90c0-482b-8737-344a07df87c8	iframe_count	0.1	dom
6c5443ad-e9c2-4883-acba-e7544243c06e	059ec7d4-90c0-482b-8737-344a07df87c8	logo_match	0	visual
089deffe-919c-4469-98cd-57867e4dd9d6	a80f6003-eb1a-4dd7-8ac0-50ed55b8519a	len_url	0.5	url
c97360ae-365c-413f-ac23-257c2c2b533e	a80f6003-eb1a-4dd7-8ac0-50ed55b8519a	has_https	-0.2	url
6996c71a-00fd-4288-978f-7be38b77ac9c	a80f6003-eb1a-4dd7-8ac0-50ed55b8519a	iframe_count	0.1	dom
da96230d-16a5-4a1a-b890-3df65a7132d4	a80f6003-eb1a-4dd7-8ac0-50ed55b8519a	logo_match	0	visual
\.


--
-- Data for Name: scans; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.scans (id, user_id, url, status, created_at, is_deleted, deleted_at, deleted_by) FROM stdin;
eea57ee0-1359-48fe-93ba-00704fb03978	\N	http://phish-example.com	COMPLETED	2026-01-28 18:03:16.772	f	\N	\N
51c20920-353c-4701-8e2e-ce7d5e61fcdc	\N	http://delete-me.com	COMPLETED	2026-01-28 18:45:21.563	t	2026-01-28 18:45:21.62	d7cbd536-d33a-49b1-bc85-9b56b031568c
d484639c-b879-40a6-b06e-f0e700bb1a2e	\N	http://phish-example.com	COMPLETED	2026-01-28 19:06:18.678	f	\N	\N
18e5cb5e-c45c-49e9-952b-fe328789711f	\N	http://phish-example.com	COMPLETED	2026-01-28 19:22:41.302	f	\N	\N
24fc8681-9a6a-47dc-a22d-1c3f65178f81	\N	http://delete-me.com	COMPLETED	2026-01-28 19:22:58.042	t	2026-01-28 19:22:58.061	d7cbd536-d33a-49b1-bc85-9b56b031568c
1dc99bb1-87fa-47f9-b69e-08d25c21ea3a	5af0642b-cbaf-4d34-8cf2-a98f922658b8	https://www.google.com	FAILED	2026-02-09 17:53:20.64	f	\N	\N
237e867e-1e44-4306-986c-39ed019d0875	e55d1072-4df0-41a2-8c6d-69cfead340d6	https://www.google.com	PENDING	2026-02-09 17:54:59.544	f	\N	\N
08fece33-795a-4c64-ba58-5ddc404bfbae	ee898683-c173-4c78-bffd-cdf81b2c766d	https://www.google.com	COMPLETED	2026-02-09 17:58:17.356	f	\N	\N
7a656c73-fbf0-4639-84b0-40efd183c348	2f0f043d-0621-4c6b-a71b-172d78679b77	https://www.google.com	COMPLETED	2026-02-09 23:00:18.271	f	\N	\N
f049a3ed-9587-4ad2-b7fe-37ec4bd1334c	90309ef5-cf75-42a0-9574-4ca176604802	https://discord.com	COMPLETED	2026-02-09 23:07:24.103	f	\N	\N
e61d0621-36f8-415c-b53e-fd6e20466974	\N	https://discord.com	COMPLETED	2026-02-20 01:20:11.271	f	\N	\N
eaae622b-b532-4c1c-82fd-925246adb2eb	\N	https://youtube.com	COMPLETED	2026-02-20 01:20:47.222	f	\N	\N
0d6e5113-ffd9-4918-b910-5dd44293a2dc	\N	https://honeypotdashboard.netlify.app	COMPLETED	2026-02-20 01:21:14.455	f	\N	\N
\.


--
-- Data for Name: testimonials; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.testimonials (id, review_id, published_at, display_text) FROM stdin;
352973e1-56cd-4a77-a0e5-4d11dc4d6492	533cb00c-01d5-40a9-a86b-e656eab894be	2026-01-28 18:06:42.63	Great system! Caught a phish.
ef378397-fe06-49f8-a80d-0d48855b0524	d4cce114-0a83-405a-bbc4-dd445c690e09	2026-01-28 19:22:49.674	Great system! Caught a phish.
\.


--
-- Data for Name: pipeline_health_logs; Type: TABLE DATA; Schema: mlops; Owner: postgres
--

COPY mlops.pipeline_health_logs (id, service_name, status, latency_ms, error_details, "timestamp") FROM stdin;
368409c1-43d6-4014-b199-6046e3618eba	retraining_pipeline	healthy	1200	\N	2026-01-28 18:58:31.694
d78618d3-27b2-43e7-b5fb-496e07ab779f	retraining_pipeline	healthy	1200	\N	2026-01-28 19:23:12.97
\.


--
-- Data for Name: retraining_jobs; Type: TABLE DATA; Schema: mlops; Owner: postgres
--

COPY mlops.retraining_jobs (id, triggered_by, start_time, end_time, status, metrics_summary) FROM stdin;
70088304-27e9-4789-8b8a-19690b4bf0b6	d7cbd536-d33a-49b1-bc85-9b56b031568c	2026-01-28 18:58:26.679	2026-01-28 18:58:31.688	completed	{"accuracy":0.98,"f1":0.97}
afb82b9e-aa99-4dc4-86ce-6f59fc67263a	d7cbd536-d33a-49b1-bc85-9b56b031568c	2026-01-28 19:23:07.951	2026-01-28 19:23:12.957	completed	{"accuracy":0.98,"f1":0.97}
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c1b5132d-da69-4786-85d9-f2b2ef9eebd0	742128ca4ee6c94e2fbab07ddaddd019d9835c65206961d32a028d84ce0976fa	2026-01-28 20:34:44.759588+05	20260128153444_init_auth	\N	\N	2026-01-28 20:34:44.683176+05	1
cf6f44d3-d64a-460e-82f1-10937be081d5	a313e14a70646b6b9ca708aeb9f86e104620cb151bc84d5a22e8bf9d39c69717	2026-01-28 22:40:56.91463+05	20260128174056_add_2fa_flag	\N	\N	2026-01-28 22:40:56.902653+05	1
34d76bc8-8ef3-46e2-877e-dce419c09427	2358425eb9d3491fdfaa09a3047755a31d77b7393567debde6b774b19c3a017c	2026-01-28 23:01:30.450362+05	20260128180130_add_core_scans	\N	\N	2026-01-28 23:01:30.327229+05	1
ebfb25c8-92a3-425d-a576-041b47ee22e1	707e292abc8ef9086c28ac468907951d66508ecb86dac1f7ca997497e13a3cb0	2026-01-28 23:05:25.636992+05	20260128180525_add_reviews	\N	\N	2026-01-28 23:05:25.608723+05	1
0e3ffa99-6871-4ed0-b986-759342d31644	57496612047f47c2579b03a6558bd94b3509df0b801c865fdbd8fc791e724486	2026-01-28 23:44:13.924406+05	20260128184413_add_admin_analytics	\N	\N	2026-01-28 23:44:13.897778+05	1
6dc79fa7-32b7-4bb8-9090-ec46343bda40	97e3330455d90203d7aa10a732bbe8db93899960d3af238e37b88aa79c9ee819	2026-01-28 23:49:56.834837+05	20260128184956_add_mlops	\N	\N	2026-01-28 23:49:56.815354+05	1
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
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


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

\unrestrict Dhwk2OajXBcGRC9nf46tZB0rbFotbJz1yfsl2BfAeJvwLydf8x3dII7ZIiLzuz1

