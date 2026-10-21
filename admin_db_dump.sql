--
-- PostgreSQL database dump
--

\restrict Foq31SnpcqBA86K1TwL2tf4pEP0sd1Ln2ZGD7NtwhM80Boaqc7f0Cxcc75HIVoC

-- Dumped from database version 10.23 (Ubuntu 10.23-0ubuntu0.18.04.2)
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


SET default_tablespace = '';

--
-- Name: auth_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_session (
    session_id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: auth_session_session_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_session_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_session_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_session_session_id_seq OWNED BY public.auth_session.session_id;


--
-- Name: mst_currency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_currency (
    currency_id integer NOT NULL,
    currency_name character varying(100) NOT NULL,
    currency_code character varying(10) NOT NULL,
    currency_symbol character varying(10),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: mst_currency_currency_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_currency_currency_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_currency_currency_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_currency_currency_id_seq OWNED BY public.mst_currency.currency_id;


--
-- Name: mst_estimation_phases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_estimation_phases (
    phase_id integer NOT NULL,
    phase_name character varying(100),
    phase_code character varying(50),
    description character varying(500),
    display_order integer,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true
);


--
-- Name: mst_estimation_phases_phase_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_estimation_phases_phase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_estimation_phases_phase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_estimation_phases_phase_id_seq OWNED BY public.mst_estimation_phases.phase_id;


--
-- Name: tbl_menuwise_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tbl_menuwise_permission (
    id integer NOT NULL,
    menu_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: mst_menu_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_menu_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_menu_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_menu_permissions_id_seq OWNED BY public.tbl_menuwise_permission.id;


--
-- Name: mst_menus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_menus (
    menu_id integer NOT NULL,
    menu_name character varying(100) NOT NULL,
    menu_key character varying(100) NOT NULL,
    icon character varying(50),
    parent_id integer,
    sort_order integer NOT NULL,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true NOT NULL,
    route_path character varying(255)
);


--
-- Name: mst_menus_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_menus_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_menus_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_menus_menu_id_seq OWNED BY public.mst_menus.menu_id;


--
-- Name: mst_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_permissions (
    permission_id integer NOT NULL,
    permission_name character varying(100) NOT NULL,
    permission_key character varying(100) NOT NULL,
    description character varying(500),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: mst_permissions_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_permissions_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_permissions_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_permissions_permission_id_seq OWNED BY public.mst_permissions.permission_id;


--
-- Name: mst_permissions_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_permissions_tracker (
    tracker_id integer NOT NULL,
    permission_id integer NOT NULL,
    permission_name character varying(100) NOT NULL,
    permission_key character varying(100) NOT NULL,
    description character varying(500),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: mst_permissions_tracker_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_permissions_tracker_tracker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_permissions_tracker_tracker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_permissions_tracker_tracker_id_seq OWNED BY public.mst_permissions_tracker.tracker_id;


--
-- Name: mst_proposal_section; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_proposal_section (
    proposal_section_id integer NOT NULL,
    section_name character varying(255),
    section_description text,
    display_order integer,
    is_active boolean DEFAULT true,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer
);


--
-- Name: mst_proposal_section_proposal_section_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_proposal_section_proposal_section_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_proposal_section_proposal_section_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_proposal_section_proposal_section_id_seq OWNED BY public.mst_proposal_section.proposal_section_id;


--
-- Name: mst_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_rate (
    ratemaster_id integer NOT NULL,
    role_name character varying(100),
    role_code character varying(50),
    rate_type character varying(20),
    currency_id integer,
    default_rate numeric(15,2),
    location character varying(100),
    description character varying(500),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true
);


--
-- Name: mst_rate_ratemaster_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_rate_ratemaster_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_rate_ratemaster_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_rate_ratemaster_id_seq OWNED BY public.mst_rate.ratemaster_id;


--
-- Name: mst_rate_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_rate_tracker (
    tracker_id integer NOT NULL,
    ratemaster_id integer,
    role_name character varying(100),
    role_code character varying(50),
    rate_type character varying(20),
    currency_id integer,
    default_rate numeric(15,2),
    location character varying(100),
    description character varying(500),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true
);


--
-- Name: mst_rate_tracker_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_rate_tracker_tracker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_rate_tracker_tracker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_rate_tracker_tracker_id_seq OWNED BY public.mst_rate_tracker.tracker_id;


--
-- Name: mst_rfp_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_rfp_questions (
    question_id integer NOT NULL,
    question character varying(500) NOT NULL,
    description character varying(500),
    display_order integer,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true
);


--
-- Name: mst_rfp_questions_question_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_rfp_questions_question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_rfp_questions_question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_rfp_questions_question_id_seq OWNED BY public.mst_rfp_questions.question_id;


--
-- Name: mst_rfp_questions_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_rfp_questions_tracker (
    tracker_id integer NOT NULL,
    question_id integer NOT NULL,
    question character varying(500) NOT NULL,
    description character varying(500),
    display_order integer,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: mst_rfp_questions_tracker_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_rfp_questions_tracker_tracker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_rfp_questions_tracker_tracker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_rfp_questions_tracker_tracker_id_seq OWNED BY public.mst_rfp_questions_tracker.tracker_id;


--
-- Name: mst_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_roles (
    role_id integer NOT NULL,
    role_name character varying(100) NOT NULL,
    role_code character varying(50),
    description character varying(100),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true
);


--
-- Name: mst_roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_roles_role_id_seq OWNED BY public.mst_roles.role_id;


--
-- Name: mst_roles_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_roles_tracker (
    tracker_id integer NOT NULL,
    role_id integer NOT NULL,
    role_name character varying(100) NOT NULL,
    role_code character varying(50),
    description character varying(100),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: mst_roles_tracker_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_roles_tracker_tracker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_roles_tracker_tracker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_roles_tracker_tracker_id_seq OWNED BY public.mst_roles_tracker.tracker_id;


--
-- Name: mst_stage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_stage (
    stage_id integer NOT NULL,
    stage_name character varying(100),
    description text,
    win_percentage numeric(5,2),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true
);


--
-- Name: mst_stage_stage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_stage_stage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_stage_stage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_stage_stage_id_seq OWNED BY public.mst_stage.stage_id;


--
-- Name: mst_stage_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_stage_tracker (
    stage_tracker_id integer NOT NULL,
    previous_stage_id integer,
    stage_name character varying(100),
    description text,
    win_percentage numeric(5,2),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_current boolean DEFAULT true
);


--
-- Name: mst_stage_tracker_stage_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_stage_tracker_stage_tracker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_stage_tracker_stage_tracker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_stage_tracker_stage_tracker_id_seq OWNED BY public.mst_stage_tracker.stage_tracker_id;


--
-- Name: mst_sub_stage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_sub_stage (
    sub_stage_id integer NOT NULL,
    stage_id integer,
    sub_stage_name character varying(150),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true
);


--
-- Name: mst_sub_stage_sub_stage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_sub_stage_sub_stage_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_sub_stage_sub_stage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_sub_stage_sub_stage_id_seq OWNED BY public.mst_sub_stage.sub_stage_id;


--
-- Name: mst_sub_stage_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_sub_stage_tracker (
    sub_stage_id_tracker integer NOT NULL,
    sub_stage_id integer,
    stage_id integer,
    sub_stage_name character varying(150),
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_current boolean DEFAULT true
);


--
-- Name: mst_sub_stage_tracker_sub_stage_id_tracker_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_sub_stage_tracker_sub_stage_id_tracker_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_sub_stage_tracker_sub_stage_id_tracker_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_sub_stage_tracker_sub_stage_id_tracker_seq OWNED BY public.mst_sub_stage_tracker.sub_stage_id_tracker;


--
-- Name: mst_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mst_user (
    user_id integer NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role_id integer,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true
);


--
-- Name: mst_user_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mst_user_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mst_user_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mst_user_user_id_seq OWNED BY public.mst_user.user_id;


--
-- Name: password_reset_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_token (
    token_id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: password_reset_token_token_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.password_reset_token_token_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: password_reset_token_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.password_reset_token_token_id_seq OWNED BY public.password_reset_token.token_id;


--
-- Name: tbl_estimation_phases_tracker; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tbl_estimation_phases_tracker (
    phase_tracker_id integer NOT NULL,
    phase_id integer,
    phase_name character varying(100),
    phase_code character varying(50),
    opportunity_id integer,
    description character varying(500),
    display_order integer,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_current boolean DEFAULT true
);


--
-- Name: tbl_estimation_phases_tracker_phase_tracker_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tbl_estimation_phases_tracker_phase_tracker_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tbl_estimation_phases_tracker_phase_tracker_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tbl_estimation_phases_tracker_phase_tracker_id_seq OWNED BY public.tbl_estimation_phases_tracker.phase_tracker_id;


--
-- Name: tbl_reason_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tbl_reason_codes (
    reason_code_id integer NOT NULL,
    reason_name character varying(100),
    reason_category character varying(100),
    description text,
    is_active boolean DEFAULT true,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_dt timestamp without time zone,
    updated_by integer
);


--
-- Name: tbl_reason_codes_reason_code_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tbl_reason_codes_reason_code_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tbl_reason_codes_reason_code_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tbl_reason_codes_reason_code_id_seq OWNED BY public.tbl_reason_codes.reason_code_id;


--
-- Name: tbl_role_menu_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tbl_role_menu_permission (
    id integer NOT NULL,
    role_id integer NOT NULL,
    menu_id integer NOT NULL,
    permission_id integer NOT NULL,
    created_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer NOT NULL,
    updated_dt timestamp without time zone,
    updated_by integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: tbl_role_menu_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tbl_role_menu_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tbl_role_menu_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tbl_role_menu_permission_id_seq OWNED BY public.tbl_role_menu_permission.id;


--
-- Name: auth_session session_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_session ALTER COLUMN session_id SET DEFAULT nextval('public.auth_session_session_id_seq'::regclass);


--
-- Name: mst_currency currency_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_currency ALTER COLUMN currency_id SET DEFAULT nextval('public.mst_currency_currency_id_seq'::regclass);


--
-- Name: mst_estimation_phases phase_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_estimation_phases ALTER COLUMN phase_id SET DEFAULT nextval('public.mst_estimation_phases_phase_id_seq'::regclass);


--
-- Name: mst_menus menu_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_menus ALTER COLUMN menu_id SET DEFAULT nextval('public.mst_menus_menu_id_seq'::regclass);


--
-- Name: mst_permissions permission_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_permissions ALTER COLUMN permission_id SET DEFAULT nextval('public.mst_permissions_permission_id_seq'::regclass);


--
-- Name: mst_permissions_tracker tracker_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_permissions_tracker ALTER COLUMN tracker_id SET DEFAULT nextval('public.mst_permissions_tracker_tracker_id_seq'::regclass);


--
-- Name: mst_proposal_section proposal_section_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_proposal_section ALTER COLUMN proposal_section_id SET DEFAULT nextval('public.mst_proposal_section_proposal_section_id_seq'::regclass);


--
-- Name: mst_rate ratemaster_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rate ALTER COLUMN ratemaster_id SET DEFAULT nextval('public.mst_rate_ratemaster_id_seq'::regclass);


--
-- Name: mst_rate_tracker tracker_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rate_tracker ALTER COLUMN tracker_id SET DEFAULT nextval('public.mst_rate_tracker_tracker_id_seq'::regclass);


--
-- Name: mst_rfp_questions question_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rfp_questions ALTER COLUMN question_id SET DEFAULT nextval('public.mst_rfp_questions_question_id_seq'::regclass);


--
-- Name: mst_rfp_questions_tracker tracker_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rfp_questions_tracker ALTER COLUMN tracker_id SET DEFAULT nextval('public.mst_rfp_questions_tracker_tracker_id_seq'::regclass);


--
-- Name: mst_roles role_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_roles ALTER COLUMN role_id SET DEFAULT nextval('public.mst_roles_role_id_seq'::regclass);


--
-- Name: mst_roles_tracker tracker_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_roles_tracker ALTER COLUMN tracker_id SET DEFAULT nextval('public.mst_roles_tracker_tracker_id_seq'::regclass);


--
-- Name: mst_stage stage_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_stage ALTER COLUMN stage_id SET DEFAULT nextval('public.mst_stage_stage_id_seq'::regclass);


--
-- Name: mst_stage_tracker stage_tracker_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_stage_tracker ALTER COLUMN stage_tracker_id SET DEFAULT nextval('public.mst_stage_tracker_stage_tracker_id_seq'::regclass);


--
-- Name: mst_sub_stage sub_stage_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_sub_stage ALTER COLUMN sub_stage_id SET DEFAULT nextval('public.mst_sub_stage_sub_stage_id_seq'::regclass);


--
-- Name: mst_sub_stage_tracker sub_stage_id_tracker; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_sub_stage_tracker ALTER COLUMN sub_stage_id_tracker SET DEFAULT nextval('public.mst_sub_stage_tracker_sub_stage_id_tracker_seq'::regclass);


--
-- Name: mst_user user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_user ALTER COLUMN user_id SET DEFAULT nextval('public.mst_user_user_id_seq'::regclass);


--
-- Name: password_reset_token token_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token ALTER COLUMN token_id SET DEFAULT nextval('public.password_reset_token_token_id_seq'::regclass);


--
-- Name: tbl_estimation_phases_tracker phase_tracker_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_estimation_phases_tracker ALTER COLUMN phase_tracker_id SET DEFAULT nextval('public.tbl_estimation_phases_tracker_phase_tracker_id_seq'::regclass);


--
-- Name: tbl_menuwise_permission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_menuwise_permission ALTER COLUMN id SET DEFAULT nextval('public.mst_menu_permissions_id_seq'::regclass);


--
-- Name: tbl_reason_codes reason_code_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_reason_codes ALTER COLUMN reason_code_id SET DEFAULT nextval('public.tbl_reason_codes_reason_code_id_seq'::regclass);


--
-- Name: tbl_role_menu_permission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_role_menu_permission ALTER COLUMN id SET DEFAULT nextval('public.tbl_role_menu_permission_id_seq'::regclass);


--
-- Data for Name: auth_session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_session (session_id, user_id, token_hash, expires_at, created_dt) FROM stdin;
1	1	8d574ca24311098dfa35626b9d9320bee15e62cb316f0e0d2011d0a8070cea60	2026-09-23 18:49:00.545	2026-09-16 13:19:00.628939
2	1	f4f481e8d4845d84739356071e7da3d9fda3b6154e8fce7566681f382116c103	2026-09-24 14:00:58.884	2026-09-17 08:30:59.281717
3	1	1a9d111baef0b943899943885ef80e44cbdcdb02546d2c6a5f576a7e799ade3e	2026-09-24 14:01:17.325	2026-09-17 08:31:17.72316
4	1	6375cc7631bdc59f694b3a0c2a6fcddba0cae197cb1f963e7dc22583d94e7b63	2026-09-24 14:22:45.201	2026-09-17 08:52:45.615
5	1	5457bc756ea08e9d29ae74eeba997242287aa48269dbac4f3eb12ddef518d159	2026-09-24 15:12:50.295	2026-09-17 09:42:50.735383
6	1	dafc5aae56887ca0f816b14bcd01031325175b3ae80142c5deebf9ea45a5db89	2026-09-24 15:12:59.179	2026-09-17 09:42:59.619651
7	1	c7f671631bca94a4a51e7d6848bd914b53768e04258d673f7f4b953417898b3b	2026-09-24 15:50:40.241	2026-09-17 10:20:40.702655
8	4	960e40c960c6d3411cab04d2f9163765ef3fb491e3331ab767b7adbac36cd3ec	2026-09-24 15:51:47.019	2026-09-17 10:21:47.442491
9	1	1c705b0e5bc179b23005f7051cef4dde129969d500dc7b1fa79e882f36ae33df	2026-09-24 16:00:07.665	2026-09-17 10:30:08.091174
10	4	f9477e5869ed94b6d838cd032356a1f16f9876bfe731b313e3ef8e1001b6fb33	2026-09-24 16:17:20.444	2026-09-17 10:47:20.879413
11	4	5c947862ea72e37eb6763d7f439d1aa8a12c868056216b7a2681af9228241d4e	2026-09-24 16:21:02.092	2026-09-17 10:51:02.529409
12	4	9dbb4feb27ba2b4187a5746c09b2bcd5e2e07d5d914b2b9348bcd495979ce45d	2026-09-24 16:30:32.927	2026-09-17 11:00:33.369804
13	1	4c8b8a42217eff64b86e81a40ce5eb3c8be3ddd4772efc9c927f64a6213a892c	2026-09-25 11:05:27.499	2026-09-18 05:35:28.691728
14	1	3a46cda2f99fc0e41472b836bb87f161d296133d572e18779c5ff90c3a7bcb4b	2026-09-25 18:02:14.601	2026-09-18 12:32:16.386942
15	1	0f1124b427f3e18fc6adc59846da61acd4c4e200a33521bfcff7092d68dfdaee	2026-09-25 18:04:14.228	2026-09-18 12:34:16.000331
16	1	f24ff7b266dc82baf226178533101db0b9259e6398aef106bc9283f802d13efb	2026-09-25 18:21:23.362	2026-09-18 12:51:25.152647
17	1	9affd76094a7cd09febcdb16d3ee53d81574efcac2777247960503df5c7592e2	2026-09-28 15:05:12.709	2026-09-21 09:35:17.857928
18	5	20c66be7950f6305b64af8bc4f6432da9356a96f9c5533a53720cae9227ae3b1	2026-09-28 15:07:43.761	2026-09-21 09:37:48.91063
19	6	da03470ec6dbab18cec132614d15f1af110e5b105551e91e9237431ed48bc9ef	2026-09-28 15:59:48.076	2026-09-21 10:29:53.264358
20	1	0a01692c0bd0b14a281005bb36b9e62497de7c63740d1635a8b1121a8dcd3897	2026-09-28 16:09:13.616	2026-09-21 10:39:18.811675
21	4	aaf93d3cb34f30d64f8646c61df8994e0b77b7e6a9a4edcd61a614e63d74e998	2026-09-28 16:17:28.888	2026-09-21 10:47:34.790552
22	1	f5069e0e7d6742395542958fe264d6289d473204f83ba3062b5020b1eda69fe7	2026-09-28 17:24:42.61	2026-09-21 11:54:47.857312
23	1	484767d2e44c14b2e597cb0431da572e50e85348e6cecef17a7186031c36a0dc	2026-09-28 17:59:25.767	2026-09-21 12:29:31.046115
24	1	93fc382a5b48139457a17e93c7232a5cd4983aa293933553d46b330c4f03d061	2026-09-28 18:01:32.135	2026-09-21 12:31:37.414811
25	1	ba09f6ebf18ba430b48c0ca6cb5e92431821db506bd06a0089f8ca7a7a4589a6	2026-09-28 18:05:45.37	2026-09-21 12:35:50.653921
26	7	a5662657ab0840c391cb77bbf304ee9e3b65f5278ea726a2d20bbd8170eedbc2	2026-09-29 10:54:20.01	2026-09-22 05:24:20.479436
27	7	37bfb10c5def6aab420094c401ec36575d35233977a1b127b7d2d1397f5205be	2026-09-29 10:56:43.787	2026-09-22 05:26:44.257831
28	7	f7307a827ad91c962d399a76a70783a6d610514a60f22d971d5d77b2e634fffb	2026-09-29 10:56:43.921	2026-09-22 05:26:44.392501
29	7	de41ad33eff105cfc46d957b4420b52d2c7bc6678d3678d446f5696280f4fadd	2026-09-29 10:57:50.492	2026-09-22 05:27:50.964096
30	1	f57e4fa098b18b4336d2af7b0f8c60057bfd32c3ebb666b0dbc42b7b3c441091	2026-09-29 10:59:55.14	2026-09-22 05:29:55.633989
31	1	6a5c7d2ff24156b955fffc15b950880eabce8cf85f567aa2e66b8139997cf027	2026-09-29 11:14:06.436	2026-09-22 05:44:06.94206
32	1	5f31f66c652d553cd38951bd3d1a4b5903fa8264240db4b64a2dd8b3705f80d9	2026-09-29 11:59:44.491	2026-09-22 06:29:44.998243
33	7	6411da9968646062a1bd651461402c5af2b0fe461b083bec52fc62e0d4424b05	2026-09-29 12:36:53.833	2026-09-22 07:06:54.357517
34	8	0fdc73ebb020b7f26f285c2003371817ab6d84f67ae4dba53e835978b73a5e95	2026-09-29 14:16:54.765	2026-09-22 08:46:55.271964
35	8	9a47eaee4a0b5d7d411bb543717f107e25ba389eef96b505ca7adf0368bda665	2026-09-29 14:17:20.203	2026-09-22 08:47:20.708416
36	8	363b73413bed3556c1995fcd120855421fd7bc5f3c72ddae00162383eb89461a	2026-09-29 14:25:14.026	2026-09-22 08:55:14.530409
37	4	ad31c660c6ac4eca56fefd604ae992a977effc5b9d7ffe953588690446037ed3	2026-09-29 14:38:17.127	2026-09-22 09:08:17.717279
38	8	86f45579edbd2c93a2bbe7d382329bbd7eefeb3834f4797cf1bf63e3d3386fdb	2026-09-29 14:39:28.233	2026-09-22 09:09:28.740001
39	8	94e82e824a716fab61ebf7de8bf37d4e01f37e160e79e56dcf686923890fe13b	2026-09-29 14:53:39.535	2026-09-22 09:23:40.063496
40	8	bc4832f873e608856c98f8111f3d4d0246c8e5135acc5eebd10670a4b2d6beec	2026-09-29 14:56:27.344	2026-09-22 09:26:27.87839
41	8	08d194f0f9a7e1d630417adf14a945746f707814dc24dafd9acceb72d6ede88b	2026-09-29 14:57:15.183	2026-09-22 09:27:15.719074
42	7	5651849b02a169ca04e0f49e237613598920a567df0e9956aca761715f327952	2026-09-29 15:05:07.095	2026-09-22 09:35:07.698949
43	4	258313e582e4c548b4b9b108a0febba4eceffe74ade77abe06f54f15be0fa0e1	2026-09-29 15:18:47.269	2026-09-22 09:48:47.915983
44	1	43b4818fd55ce7bb20be19bbb664b7dec73ce7132ee3335d8111b387a475ce91	2026-09-29 15:37:13.583	2026-09-22 10:07:14.238149
45	8	5d818698c6103dd133e7d417206e5a6a98cdfa36ee9dd9ed857f8f3c791ed110	2026-09-29 16:09:58.626	2026-09-22 10:39:59.184272
46	4	9dbcca58bc8fae00eb74cd27d722a74f4b5ae0cbb6aac1665e1aa1c850a75449	2026-09-29 16:30:53.311	2026-09-22 11:00:54.000613
47	1	b778fe25a6010177dd93185f8ab90bd105b9dd9aaf8fead43e7e4b6fe41135b5	2026-09-29 16:34:54.494	2026-09-22 11:04:55.187322
48	4	8a5ededc3578a129e0dc09800d7923dd4e035162cd168d2845f3cec4169abb82	2026-09-29 16:35:56.557	2026-09-22 11:05:57.257789
49	8	cfe46782f69f631d40034820f4a8a4ad3837f15a8110a19a293fa22614fc11a8	2026-09-29 16:41:11.576	2026-09-22 11:11:12.272681
50	4	1e4ac32b043bdc381554daefd20b0ca7226ad7351d9baa933d3bf6d5e7fef9df	2026-09-29 16:43:52.218	2026-09-22 11:13:52.926156
51	1	7e998426e38c3fa010bc41da147d077e7d2e5ed8c0af7d9d0c5fddc3313a996a	2026-09-29 17:05:29.612	2026-09-22 11:35:30.323608
52	8	e4991df3afcf169e06911e753f347bea1c2f79963a8efd1447c61d75f1cab0cf	2026-09-29 17:22:28.68	2026-09-22 11:52:29.308554
53	8	68c1b32ddfbb3bf565595ed1ffcf0a93c7619233124d3c898d076eb826b25d34	2026-09-29 17:36:51.456	2026-09-22 12:06:52.086228
54	8	ce0a76041bb919472db65b2333c69a72daf9f8d946f4e6bc0498dafaf7a2c26c	2026-09-29 18:00:47.268	2026-09-22 12:30:47.908171
55	8	2db13316d7b37c415ea733a663d281fca4be354daf9846126b123f574d40a19a	2026-09-29 18:01:23.485	2026-09-22 12:31:24.124615
56	8	0da443aaa2a62577d9aa6ec9f08a12a0ddc90202f2fbb544d1a3dbdd177202da	2026-09-29 18:08:54.382	2026-09-22 12:38:55.022842
57	8	3b736f059df506bc71c565321f8bd2d326cdac62673c51427474b279fbd86baa	2026-09-29 18:14:33.076	2026-09-22 12:44:33.71634
58	8	783e119241abeb237ffc84ef3874eba92b0c3a84584bd99a82de6ffb52f5b7f3	2026-09-29 18:17:40.147	2026-09-22 12:47:40.785763
59	8	9040c3c2c44aba77c53c15ec5b400af51407e9fdd53a8b9bfcc55c8dabca4a34	2026-09-29 18:18:19.641	2026-09-22 12:48:20.280102
60	8	cb421acd0366c21d86ba6ac21ab072c788498bd85372b776a856044aebbe5c91	2026-09-29 18:22:33.56	2026-09-22 12:52:34.197306
61	8	3b1476cff5060c6aa87e589342351dcfe68cfaa1d7f08e6981164f0f9c9aa303	2026-09-30 10:26:10.934	2026-09-23 04:56:11.611125
62	8	d1908a7b7a97a333331897c776ecb955838f80884400b0457655d77ec0409515	2026-09-30 10:34:01.375	2026-09-23 05:04:02.05308
63	1	42fd9ab2e3c55ab1787cc3d4d8e6f7c8f6c49e41757aea5a7a0d5fed892e012f	2026-09-30 13:53:42.343	2026-09-23 08:23:43.968921
64	8	bfbeed3a4eb1f1aaf93e9d4ccb4715e961aac1b4f704c769b3ebb4f18ace730a	2026-09-30 14:41:26.058	2026-09-23 09:11:26.788596
65	8	1792abd4112ce47f7507491781aec0997f36eb407c0fa0b73bd1508559d1ec03	2026-09-30 15:23:09.244	2026-09-23 09:53:09.976939
66	8	c80429b26353c5c137de1e529fe27b549bde5360eeb94e172afe4755abe38fbd	2026-09-30 15:43:06.871	2026-09-23 10:13:07.613053
67	8	fd7c9a100c0344218c196681e579b7f4838bc3a04f64e627bb9ed0469eacb784	2026-09-30 16:24:12.824	2026-09-23 10:54:13.578429
68	8	9e5aa02858af0f74d9443f8b887fb83da6bab9702a376d5ae14ea1880334bd91	2026-09-30 17:21:02.689	2026-09-23 11:51:03.450862
69	8	c469fa1b5e41b81ac71852febbfdead2cd0f1748e3de6fa4c331e23c99517585	2026-09-30 17:22:03.631	2026-09-23 11:52:04.393324
70	8	8514a135e90dc6fddbdaebde494630c60648b0b68a363b60ef4b7efa73a69ab5	2026-09-30 17:25:10.094	2026-09-23 11:55:10.85725
71	8	f106646f6917fc0243a229d43f0502245ea1e645e1e8461c7143e1a7acd1a9e7	2026-09-30 17:26:08.277	2026-09-23 11:56:09.040287
72	8	0934c62ca912d360dc4d1497304968175755ce7d1f5fc1cb32803a05721cdd0f	2026-09-30 17:28:12.839	2026-09-23 11:58:13.603173
73	8	c620a1f8685e03b33ff791ac39d8fdffe24163690082297c52c97228f50525ee	2026-09-30 17:28:55.473	2026-09-23 11:58:56.237602
74	8	64f38ee1605653e4e5a6cb00b4fea4fd7d992237884b2bf367b16fc059f8d6ce	2026-09-30 17:38:38.201	2026-09-23 12:08:38.966602
75	1	ed7445ff070a52c064ae73a6ac2bf97bcc7ee15168eb4a40eccc07aaa7320f3d	2026-09-30 18:25:05.697	2026-09-23 12:55:07.537417
76	1	58ef87c979706525e669968c3d9e9b7e309492c0b84034238ea847c5bae6f77f	2026-09-30 18:41:23.117	2026-09-23 13:11:24.972429
77	1	5a57475d59df7352c1ffc75493a579cec2ccc0db0ee9c390638cbc2b0a823bc0	2026-09-30 18:42:17.483	2026-09-23 13:12:19.33933
78	1	e2aced4ae427816fdc1399ab770e56c65e5a6d441ea1dee5a747c142a059f53e	2026-09-30 18:57:59.091	2026-09-23 13:28:00.961208
79	5	669a3b68ed42e5b4956da1974ca3c5fe060a6201ec95dc82fe80e4a7195f0dad	2026-09-30 19:34:39.763	2026-09-23 14:04:41.654235
80	1	17af99fc7eae790c2b56ca50bd1c57e3b04a74b234e837d0086c5927d752c351	2026-10-01 10:41:41.928	2026-09-24 05:11:44.508321
81	1	a305f4cefb03711654dfaedc5bf3f5ada4f108a840a3111de859065089a47e3c	2026-10-01 10:43:31.424	2026-09-24 05:13:34.005459
82	5	1323368303c5ec67ac1abb877cc13e4c408e89917477105f2c6c54fde2e20d6f	2026-10-01 10:43:56.518	2026-09-24 05:13:59.099282
83	1	21ae721cd034ed3dd87e38939b6b56c406ee3c58643b0cc3bbd08385674484b1	2026-10-01 10:52:46.198	2026-09-24 05:22:48.83647
84	1	b41857b0157a12e204a9e80f5b1a5a1404d912b147f39932ac33eee990ea6fcd	2026-10-01 10:55:39.893	2026-09-24 05:25:42.541802
85	1	4478bbda09ef78c25d36f2972a0d5e30029eeb448f52c760b7de2efc0f2c89c9	2026-10-01 10:57:47.811	2026-09-24 05:27:50.467719
86	4	8c24bbc99b9ff3dfc430b39ae31e052492496088601e3c3902b578a6b4ac79ee	2026-10-01 11:03:33.447	2026-09-24 05:33:36.105893
87	1	98aa435971ad7ae32086733f8705303f129889c85551f9586bfcaacc368024fd	2026-10-01 11:04:31.997	2026-09-24 05:34:34.654827
88	4	ee1127b5b03c3cbe48e417d6c3693251168dbe1ac10f49d57b1afed367d491ee	2026-10-01 11:06:02.736	2026-09-24 05:36:05.38915
89	9	8771190a608914c4806cfb096cb0fbcea1eefbbcc228ccf5297dda94ee304f3e	2026-10-01 11:09:37.953	2026-09-24 05:39:40.606165
90	9	bf8163a36f97682e41280f1d92c70c93d1fdb4e373454194851bdf5f57071c9f	2026-10-01 11:15:46.197	2026-09-24 05:45:48.855553
91	9	bf84224681c6621cffccfed4481d5f67635c28eb5fbb9f4201cc9577185651f8	2026-10-01 11:16:02.495	2026-09-24 05:46:05.153913
92	9	04979a3d5f5d1480f708315e0074d27e7e2a13f46bdd6ad8aed9923e1ee2a52e	2026-10-01 11:17:23.873	2026-09-24 05:47:26.531763
93	4	91a8c0bf60efaed9573d124f305f1db20aa0c5fa9a4b0df8aa5fbaf4a4432f44	2026-10-01 11:17:48.609	2026-09-24 05:47:51.268263
94	1	ebbc3af4ab4a3dc97c41810a0def85f7136a11ffc0dc9205b39a0f97709cb7bc	2026-10-01 11:18:22.4	2026-09-24 05:48:25.059847
95	8	9f657b6b09336c0f0f1650639756a532bfc78112215e992772a7b1e79d2350e2	2026-10-01 11:31:38.898	2026-09-24 06:01:41.518505
96	8	63af79735152f837577bd9f64ca54bde2331b3687d6fdede81c679d1ef9421d8	2026-10-01 11:33:33.37	2026-09-24 06:03:35.992547
97	9	99bb7e69153d2e3d7470da49d0d9ef58b7ace1d08cde1480136b1599da05e05b	2026-10-01 11:36:25.65	2026-09-24 06:06:28.323728
98	9	2cc2111315fe977c9938b607f82b1e10a996accb9957c83caa7e7bcf88a11e86	2026-10-01 11:48:22.667	2026-09-24 06:18:25.360618
99	1	f2db1d67e65a9e65e26a9a7a886cbb9e9d21fbeb478a5c6f7ea35a0689e4cfdc	2026-10-01 12:02:06.752	2026-09-24 06:32:09.396262
100	9	01986a8ae17f6146655221266ad1e82b6c70631008d5c0f20a613453e0d50f1e	2026-10-01 12:03:57.757	2026-09-24 06:34:00.403138
101	1	b00fa1cf91803b1ebe2783b7ecdd13e032bfe64b20dd420c6eb0277e4b62a6bc	2026-10-01 12:05:18.466	2026-09-24 06:35:21.113479
102	10	383b50af0179c852e561c38abe340a89c8b3af6c9c33a5737bd41232f1903879	2026-10-01 12:17:32.457	2026-09-24 06:47:33.186357
103	10	2bbaaad477c86c0343c01037f98f48c523b232cc1a0590b5386d31d00eec25ff	2026-10-01 12:18:38.382	2026-09-24 06:48:39.112635
104	10	aa089aba762f0f294b3806b3fbe45968f6eef8323860f22e378f0375b3f73e40	2026-10-01 12:19:46.06	2026-09-24 06:49:46.790386
105	4	c8e6bbb071f9ec86b1049dd51ecb84d9557407885edc652744ad6d91d641cfd8	2026-10-01 12:20:12.268	2026-09-24 06:50:12.99806
106	10	af2d66d650e8dbb6bc1145a5e1171dfc0302416a92330614d9ca95987bc7909c	2026-10-01 12:21:31.75	2026-09-24 06:51:34.452121
107	4	4d0f63e19315f04af9042de161925ce98b315754a999f41c665464fce9cba07a	2026-10-01 12:22:00.062	2026-09-24 06:52:02.764428
108	1	9330be5ecfb487a9d04efa0d0872930b4db81e5f30327e1c057e85211e9fcc17	2026-10-01 12:23:36.778	2026-09-24 06:53:39.429636
109	1	78df9c95499e0462cc85b211cbd54fb9a2fd30ec3d195405bb4eed27c63d9476	2026-10-01 12:23:38.027	2026-09-24 06:53:40.681187
110	9	491d35ab9310d65d8355766f12c40b57b169a05102aa0c966e0ba45636e7a8dc	2026-10-01 12:23:52.543	2026-09-24 06:53:55.24769
111	9	58beac8ce82b164c67c520fff43d9c4e812f67dc934006bb125ce58a74b79b3f	2026-10-01 12:28:32.771	2026-09-24 06:58:35.476694
112	10	d4e6735ee3399965421ad9c308d48542cc800836d9a182a84a17cb9f0fb71cc3	2026-10-01 12:46:02.122	2026-09-24 07:16:04.84806
113	9	20e3850113fdc12368b89c8aeb73b8b14ecf5fef2ef34a72e11ee93206e211cd	2026-10-01 12:48:32.074	2026-09-24 07:18:34.806796
114	9	22eea48339b604e2740069e0b186733a7e96b02ac36a16fccbd2ca1ce9637c84	2026-10-01 12:51:14.424	2026-09-24 07:21:17.150488
115	10	d9be02c2e93b67d4e5fda29efc2ce63501389769e3d8a2551bccbc8452fbd98d	2026-10-01 12:53:39.525	2026-09-24 07:23:42.256782
116	9	9cc4bbc1fac87c0cafb2466cf68042cb2129884d47825e3b0bad662c1d4acb58	2026-10-01 12:54:33.647	2026-09-24 07:24:36.377859
117	10	c4091827da5a0e0d6ea6fe99773a366419239ae86afee97a97365fb1ffc31a5b	2026-10-01 12:56:26.144	2026-09-24 07:26:28.878946
118	9	f3bd6b0849505cea95f29c58e90fdf9b8b626979d833e5206b0cacb42a511af4	2026-10-01 12:57:03.658	2026-09-24 07:27:06.397405
119	10	38e93dc845f91d4156f8a8dd6b10a09c668658621697960833a89d4830b4271d	2026-10-01 12:57:48.842	2026-09-24 07:27:51.581647
120	9	7b13aab88123eca9ad4e5604340ade0ed526968d700cc72a04f3d5d05d803ca8	2026-10-01 12:59:47.59	2026-09-24 07:29:50.32473
121	1	0671b135c22e4d84e0881983af627f4d809a610801cfe91ac526d886b4cde2c8	2026-10-01 13:36:17.027	2026-09-24 08:06:19.734331
122	10	8448b0317abb0b405fcf8a1651732e4538057ed89d6f8db37495e92d32724103	2026-10-01 13:36:17.003	2026-09-24 08:06:19.774391
123	9	19d5f9737372389af560a5c4bf99e1059deee5807f127b60262442d1ab0dc70c	2026-10-01 13:36:50.331	2026-09-24 08:06:53.102607
124	1	60e8e847e6096eee5ecb8a9bc917588d3e8291a921d85f64bc5c9ccf3563ecb6	2026-10-01 13:42:11.243	2026-09-24 08:12:13.955103
125	1	39b6c696207e8df3adc3685c37f24765ecb9c6458619ffbf8bf64ba2972101f0	2026-10-01 14:17:31.235	2026-09-24 08:47:34.115966
126	4	2aa37377cab6f6e22380003d6d80c3abc3690296f963a087d40532aadc961f0b	2026-10-01 14:27:40.066	2026-09-24 08:57:42.879337
127	1	d1f83a2b24d0e307a92ec80cf4cfefe9450d4492265d1d605d89a16e688aebea	2026-10-01 14:35:04.394	2026-09-24 09:05:07.053107
128	10	fe5f0d910265f121308916db7d38ae1010ac661486ddcba668cc6257c9a20038	2026-10-01 15:12:47.672	2026-09-24 09:42:50.518736
129	10	ee236100fcfc8357ef39efefc05110345d5c6b6cb429d02c3576b3a88cd9e385	2026-10-01 15:16:08.09	2026-09-24 09:46:10.938588
130	1	d2cd8198efd72478e1db7580c8fc856dda2af95345c074fe2888a9323f900d68	2026-10-01 15:30:22.239	2026-09-24 10:00:24.943986
131	10	abfd3d511aa70042f8c372cc45c8228d3b4eec565803e90d166219feb3221810	2026-10-01 15:33:02.419	2026-09-24 10:03:05.283372
132	11	19fd4bf3a6215054f647567024321ce560ede3e63e2f194fb1b7664ffca886eb	2026-10-01 15:38:36.274	2026-09-24 10:08:39.135358
133	12	9fe466868a540ca0f838e2511cb64678d657bea9e8477bc61c951ba9c5c13c33	2026-10-01 15:41:27.908	2026-09-24 10:11:30.770999
134	9	10695123d139ff5207eddad56a4b635beaff0ebc2cf848ddd9fb01fcca78f8d3	2026-10-01 15:43:47.309	2026-09-24 10:13:50.173181
135	8	4ddb0838a8c3ef5adf37ec60757c2a1e49b39319cd0bec953d8aa022ad5200b9	2026-10-01 15:58:54.591	2026-09-24 10:28:55.634188
136	10	549de4144dcc070e8fa24409b451c2df3b931ca3d13d1a47936f445b9d1e8fa3	2026-10-01 16:01:56.75	2026-09-24 10:31:59.62589
137	10	4541adff8caafd4257bc196f76001273cb98a2d9828751e4781bf79f127fcc6f	2026-10-01 16:02:46.857	2026-09-24 10:32:49.733364
138	10	1622bf89f43ee493752cc81d4a5aa97defb149781628a46b881bceee70e1eb66	2026-10-01 16:04:15.685	2026-09-24 10:34:18.564816
139	11	832d9893f7ff66b65048ca39fd9c3df9d31121cff37f4374748abf90cfba0281	2026-10-01 16:05:02.39	2026-09-24 10:35:05.279411
140	12	3e4eab30b12ddf0995048bfac26eb074740b9deff5ea0569bb208bd9ed5801f8	2026-10-01 16:05:21.161	2026-09-24 10:35:24.050493
141	5	fd4d34fdb9f17d25dca35e53fbb487e627203af2a5630eb2d25f7418d0240ab9	2026-10-01 16:08:32.447	2026-09-24 10:38:35.171784
142	4	b6a74cf838ba7df181b7625a430a2d1310e33be6b6f86998f10f65cfac8f9635	2026-10-01 16:09:44.591	2026-09-24 10:39:47.473099
143	5	e4d8b207aa5905efd801cda738509b05ec1b74daeb85509f5723addc2c66d89b	2026-10-01 16:10:26.892	2026-09-24 10:40:29.619315
144	9	60684b17918769f120be81caad3aa2d5abf8081cd157bd193428771eab875cd3	2026-10-01 16:11:37.474	2026-09-24 10:41:40.366054
145	5	99750d8952b63ab6ab28702ae4926829a521d13c972ad19be3e95c31e57394f5	2026-10-01 16:12:48.573	2026-09-24 10:42:51.302553
146	5	2184f84aa033318233e66d288964033a58c51ecdd4f215adc4d4975143a45cbe	2026-10-01 16:16:22.472	2026-09-24 10:46:25.205421
147	6	bda012984b09721331a650f173e8ad6d6890e5f25fa799b4311d9609530b5566	2026-10-01 16:17:14.322	2026-09-24 10:47:17.056458
148	5	dc384f4db945db7cb7e8847cec5f4630e632b406be5690d889947932f9a46df9	2026-10-01 16:26:37.079	2026-09-24 10:56:39.82011
149	1	2d92f88a477f81513319a810dea62b796e886e66e445cce8b5b8034e53a98c8c	2026-10-01 16:27:55.95	2026-09-24 10:57:58.692571
150	5	9da56e11277e169cc61f6ef9c3d71e9171dc2cc867ade78ee7b1c558325a3baa	2026-10-01 16:39:36.48	2026-09-24 11:09:39.231329
151	5	1c8f530fffd872a0aae4ccaf5ccfcc326185d3c1074f18bf086004cdf4c2a041	2026-10-01 16:43:18.669	2026-09-24 11:13:21.423284
152	1	6deb8b129128b05392f5f40ed0d39d6aa8730c4ddaa55b8ed6ae36448f1f3b2f	2026-10-01 17:13:08.758	2026-09-24 11:43:11.537168
153	4	f5f800659d0688dd66b25f53e18d3e237e472656a318fc3e84bbbc7280141b92	2026-10-01 17:24:28.61	2026-09-24 11:54:31.55482
154	4	9e1c9b981e55f8523dd02475a71689c540684bb138ff185e83109eb409710508	2026-10-01 17:29:56.866	2026-09-24 11:59:59.819249
155	9	cd806d426bbc8abd1c89964709d049063fb5446804e6d80bc42f05b75eb95ef9	2026-10-01 17:30:29.132	2026-09-24 12:00:32.086051
156	4	b08f2c8f7777a2b880ca32e7af4ebc016acdf58082e14efe01c8d09d8bc06b08	2026-10-01 17:30:56.782	2026-09-24 12:00:59.736504
157	9	0346ae4ae30970192278cbf5accebb6198b6466051de76c532a837a68e151793	2026-10-01 17:35:31.683	2026-09-24 12:05:34.642408
158	9	1406f183a7c0b080ed7bf9c14d1935eb95017c43fcd82aff7f15850edd15f314	2026-10-01 17:35:49.53	2026-09-24 12:05:52.489158
159	4	265b53ae7a2703346605f96f26c967c02ef3646e11cca7eca1e93b98fdeb93f0	2026-10-01 17:36:06.411	2026-09-24 12:06:09.370062
160	12	a3d62e2e9d2a56b3941806f1170cf79cb0926e71de515da9c27c220c65d23c4f	2026-10-01 17:42:45.711	2026-09-24 12:12:48.673929
161	4	0439f0a5754ac84e01992f048d4e6b5acf2f206f6c34cf86d214d7d59bfeea23	2026-10-01 17:51:26.919	2026-09-24 12:21:29.887671
162	12	18b811f208c69dd3e0bca014b590adc15ec6817f38b96bcb028063a2567c25d9	2026-10-01 17:58:15.304	2026-09-24 12:28:18.284087
163	13	9cec71e5f3db79b37e68df8220bf7647244b71ea92f4afa22eccb054278da167	2026-10-01 17:59:36.515	2026-09-24 12:29:39.486182
164	1	faaefd8e7e0d768db2964cbe85330ad6c59c7d17ac658f26419f380e28e88330	2026-10-01 18:15:58.424	2026-09-24 12:46:01.247169
165	1	14c73fd61a669fd76d728c486e7b8e16f4f6f0f4fbe97df00e4629e8029c926f	2026-10-01 18:17:43.883	2026-09-24 12:47:46.707187
166	1	ef4bfec31fdbde17e6b062313ea1332002711dbb4bf997640830647c070815b5	2026-10-01 18:38:55.866	2026-09-24 13:08:58.704942
167	14	5d789c6cf9b42dd0ccb952bac0e2db775ef7bc3487f78e180258aad1569286ef	2026-10-01 19:01:48.855	2026-09-24 13:31:51.874378
168	1	3c7f272206da36fec33bb455628746e67926f4db36fa169461e68434409b9145	2026-10-01 19:19:42.036	2026-09-24 13:49:44.899058
169	4	26261a4aacdcd8af8ba8259598b77840e7cfcd00245a650ce9b165e192fd30bc	2026-10-02 10:14:49.575	2026-09-25 04:44:53.280088
170	4	dc93682684de976339c8b647141c8bb45d5b5421e8fa1ec2b831f75a47a054cc	2026-10-02 11:16:09.761	2026-09-25 05:46:13.56134
171	10	25497818e92b4d0ac37521794ab668f857f03b72bdb8362dfec0bbf36de40523	2026-10-02 15:09:05.206	2026-09-25 09:39:09.181179
172	13	dda35d4c7418051d6afd087591921227edabceef6bbf7d257eddfc505a9bcc86	2026-10-02 15:57:26.025	2026-09-25 10:27:26.013663
173	10	9315a974ee7b25ebdf12faebc18e6d57ae3e7266a87076a8a04c62eacc0041a5	2026-10-02 15:58:17.198	2026-09-25 10:28:17.18689
174	13	7701c104a1ae52b50cbdf2813829e27e3e820e75579ca38d064e0c094508d84e	2026-10-02 16:39:40.015	2026-09-25 11:09:40.031667
175	8	9fedb1719dc2c8d076eab1ab28dfffc7a373ed6e1bfadbe3c780d233b9ff8c1e	2026-10-05 09:43:02.279	2026-09-28 04:13:02.276921
176	8	1c60ca8335c73cdf6faa30638867e66430f13b0536aa60ac81238ac94352ea4e	2026-10-05 10:19:50.506	2026-09-28 04:49:50.500357
177	4	9db6f1cb510fd53c97e0a79f1ddd6d074edb7ded5f25ad15c6c25dcef7a9f434	2026-10-05 10:44:44.053	2026-09-28 05:14:51.885956
178	9	db7bb9e0319e2a00acce997a45d607296d34071319b6e283d2b6b7a8a7711d4d	2026-10-05 10:45:18.632	2026-09-28 05:15:26.465622
179	10	c808a82c68facb334d76251cb185ec52d7adb150e279eadb4c608563d9fb632c	2026-10-05 10:50:09.516	2026-09-28 05:20:17.352913
180	10	3414f7399577045abf11ac3ffdead33aec11090826d651c6638248b2926bdbf8	2026-10-05 10:58:03.098	2026-09-28 05:28:02.898682
181	4	d5fa4d4457d655b817697bcb6a742cd067e32e5f70c13dfa2dcc9729af2943d8	2026-10-05 11:04:26.63	2026-09-28 05:34:26.62763
182	15	fe72a42d5d0bed39456fb89f040a39d6e21d5e6e9a191327f556827bd467b763	2026-10-05 11:44:20.74	2026-09-28 06:14:20.739419
183	4	7dac76f38a9f7af31da3c2fa42674ddb04380217d5f5e2bc80da869e083d474b	2026-10-05 11:44:43.763	2026-09-28 06:14:43.763139
184	15	0dc9c1a44955ace97917a044c2c8de888302b56c0fb4e56129b144b028738adb	2026-10-05 11:46:11.127	2026-09-28 06:16:11.125845
185	16	248d7de97a68daab96a100588d6d612af9b84f09a84a82ef114cf269c4335f1c	2026-10-05 11:48:39.066	2026-09-28 06:18:39.065894
186	1	3763b5e4d3c02239df3fd3b8042f894890661d44b1b17049ff4e0fa40c47b369	2026-10-05 11:58:36.251	2026-09-28 06:28:36.268766
187	1	73b910ebe0cdefb80d7a0fceb0c30ac044fa9ffa4ddbbe3916ff0694437ba67e	2026-10-05 12:00:46.274	2026-09-28 06:30:46.291552
188	4	d31851c0b1fcae3d529332f5305e5216ffb4c00185474470f2dd0f50ffe52fff	2026-10-05 12:04:07.742	2026-09-28 06:34:07.758967
189	1	b654b04cd191da27bc2500ed221b55888d1cb57c150792b9a206ee7a06383202	2026-10-05 12:05:38.564	2026-09-28 06:35:38.581181
190	10	7ffe514d6964dd6ed5591cf3c1f4593af1f4c2fc8e7b609413de2bdca98165ab	2026-10-05 12:48:55.412	2026-09-28 07:18:55.5085
191	1	11632a3c20497a701e6720585444294af880f5682cc9e2c620968469ba0d97b1	2026-10-05 13:30:14.344	2026-09-28 08:00:14.35862
192	1	acaa210a4065147a442461906a62cc5a2d234a197fc745c532d61294a92e2492	2026-10-05 13:31:08.451	2026-09-28 08:01:08.466488
193	1	d14706759d9c694a0263d2becb179345781bfb25b0f6ed58be9ce6cc74443302	2026-10-05 13:32:04.995	2026-09-28 08:02:05.010731
194	8	c070728d523e59c976f4fa8c7ddb9cf51356ecb94866f5ee30485fa2c1c203b6	2026-10-05 13:41:28.118	2026-09-28 08:11:28.116181
195	1	52471162f101904d26ed14bb398c4cca38098000ddff84c17263b046d46ec8a2	2026-10-05 08:19:02.16	2026-09-28 08:19:02.178309
196	1	83b4d88681501556cdabac5d2be1a93ef6aa6dee81124cec40c6f15c71d90c08	2026-10-05 08:22:53.055	2026-09-28 08:22:53.075199
197	1	a1314808d1732920e7f07bc55202c52805bf74b4c10db1075a9c53c245ee0eb5	2026-10-05 08:33:12.012	2026-09-28 08:33:12.041663
198	1	f7b187cc8febf150f4a308e2cc2c0e2df865f042ca3ac9b1c7c043a8c30f4964	2026-10-05 10:05:48.335	2026-09-28 10:05:48.344201
199	8	92d4494225eac4e09af3e6dd8249a6729723c88c1be1c6131440ef3ca07eba9a	2026-10-05 15:44:22.684	2026-09-28 10:14:22.679954
200	4	098f2745bbb2f7071b5ac9f49dd667938f269dadaf49351a27b55987e8c6e2cf	2026-10-05 15:44:50.369	2026-09-28 10:14:50.363668
201	10	7632de7043d7bc5a4e598ec1135d4a3d359abb974703045cb11609477d5539bb	2026-10-05 10:14:51.917	2026-09-28 10:14:51.932039
202	8	6e741d3a017a518ee63e7d115e4735253eb22d0a1c4ba6204d59e31ee917840b	2026-10-05 15:46:22.797	2026-09-28 10:16:22.792647
203	1	0f7b95bc32ab90252b43aacbe9daac00cddf4f6f857fc56237d09e14b7860479	2026-10-05 11:47:12.488	2026-09-28 11:47:12.500882
\.


--
-- Data for Name: mst_currency; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_currency (currency_id, currency_name, currency_code, currency_symbol, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
3	Euro	EUR	Γé¼	2026-09-22 13:10:30.48978	7	\N	\N	t
4	Euro1	EUR1	Γé¼	2026-09-22 13:11:46.118349	7	\N	\N	t
5	US Dollar	USD1	$	2026-09-22 13:14:58.679543	7	\N	\N	t
2	Euro Currency	EUR	Γé¼	2026-09-22 13:06:16.755375	5	2026-09-22 13:26:10.403156	7	t
1	Indian Rupees	INR	Γé╣	2026-09-22 13:03:36.492726	5	2026-09-22 13:27:28.815675	7	t
6	Euro5	E	Γé¼	2026-09-22 13:46:12.360424	7	\N	\N	t
7	ABC	ABC	a	2026-09-23 05:14:51.368477	9	\N	\N	t
8	gjhkj	GJHKJ	g	2026-09-23 09:19:58.293155	9	\N	\N	t
9	gjhkj2	GJHKJ2	g	2026-09-23 09:20:20.309085	9	\N	\N	t
10	gjhkj3	GJHKJ3	g	2026-09-23 09:40:30.217164	9	\N	\N	t
11	gjhkj4	GJHKJ4	g	2026-09-23 09:41:27.314917	9	\N	\N	t
12	Indian R	INR5	Γé╣	2026-09-24 05:26:39.26733	1	\N	\N	t
13	aaaa	A	@	2026-09-25 05:33:40.159693	7	\N	\N	t
14	bbb	B	bb	2026-09-25 06:46:44.975329	1	2026-09-25 06:47:47.523242	1	t
\.


--
-- Data for Name: mst_estimation_phases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_estimation_phases (phase_id, phase_name, phase_code, description, display_order, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
1	Discovery & Design	DD	Discovery & Design	1	2026-09-22 14:11:25.001531	1	2026-09-24 05:07:42.196806	8	t
5	UI Design	UD	UI Design	2	2026-09-23 06:17:22.681236	1	2026-09-24 05:07:54.372636	8	t
3	Website Setup	WS	Website Setup	3	2026-09-22 14:13:08.646666	1	2026-09-24 05:09:35.672695	8	t
7	UX Planning and Wireframing	UXW	UX Planning and Wireframing	4	2026-09-23 10:47:25.680879	8	2026-09-24 05:10:03.948999	8	t
4	Homepage	HP	Homepage	5	2026-09-23 05:39:26.79731	1	2026-09-24 05:11:00.828983	8	f
8	Get Help	GH	Get Help	6	2026-09-24 05:10:55.092627	8	2026-09-24 05:11:06.972939	8	t
9	CED Law	CL	CED Law	7	2026-09-24 05:11:41.428668	8	\N	\N	t
10	Careers	CR	Careers	8	2026-09-24 05:11:57.19244	8	\N	\N	t
\.


--
-- Data for Name: mst_menus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_menus (menu_id, menu_name, menu_key, icon, parent_id, sort_order, created_dt, created_by, updated_dt, updated_by, is_active, route_path) FROM stdin;
4	Menu Master	menu_master	Table2	1	1	2026-09-23 13:05:09.444327	1	\N	\N	t	/admin/menu-management/menu-master
5	Permission Master	permission_master	Key	1	2	2026-09-23 13:05:09.444327	1	\N	\N	t	/admin/menu-management/permission-master
6	Menu Permission Mapping	menu_permission_mapping	Link2	1	3	2026-09-23 13:05:09.444327	1	\N	\N	t	/admin/menu-management/menu-permission-mapping
7	Role Master	role_master	Shield	2	1	2026-09-23 13:05:09.444327	1	\N	\N	t	/admin/user-management/role-master
8	Role Menu Permission Assignment	role_menu_permission_assignment	Share2	2	2	2026-09-23 13:05:09.444327	1	\N	\N	t	/admin/user-management/role-menu-permission-assignment
9	User Role Assignment	user_role_assignment	UserCog	2	3	2026-09-23 13:05:09.444327	1	\N	\N	t	/admin/user-management/user-role-assignment
11	Generic RFP Question Master	generic_rfp_question_master	FileQuestion	\N	4	2026-09-23 13:05:09.444327	1	\N	\N	t	/admin/rfp-management/generic-rfp-question-master
10	Estimate Phase Master	estimate_phase_master	ListOrdered	3	1	2026-09-23 13:05:09.444327	1	2026-09-24 05:26:17.888523	1	t	/admin/estimate-management/estimate-phase-master
2	User Management	user_management	Users	\N	2	2026-09-23 13:05:09.444327	1	2026-09-24 05:27:23.817105	1	t	\N
3	Estimate Management	estimate_management	ClipboardList	\N	3	2026-09-23 13:05:09.444327	1	2026-09-24 05:28:00.776796	1	t	\N
12	Opportunities	opportunities	\N	\N	5	2026-09-24 10:14:42.217146	9	\N	\N	t	\N
13	My Tasks	my_tasks	\N	\N	6	2026-09-24 10:15:04.184855	9	\N	\N	t	\N
14	Reports	reports	\N	\N	7	2026-09-24 10:15:22.329302	9	\N	\N	t	\N
16	Gate-2 Approval	gate_2_approval	\N	\N	9	2026-09-24 10:16:05.924772	9	\N	\N	t	\N
15	Estimation	estimation	\N	\N	10	2026-09-24 10:15:40.32214	9	2026-09-24 10:54:08.892669	9	t	\N
17	Re-estimation	re_estimation	\N	\N	11	2026-09-24 10:48:55.761696	9	2026-09-24 10:54:14.581013	9	t	\N
18	gen_rfp	gen_rfp	\N	11	1	2026-09-24 12:03:33.192881	4	\N	\N	t	\N
19	Client	client	Layers	\N	12	2026-09-24 12:15:48.068501	12	\N	\N	t	\N
1	Menu Management	menu_management	Menu	\N	1	2026-09-23 13:05:09.444327	1	2026-09-28 06:21:23.621146	16	t	\N
21	gdtest	gdtest	Key	\N	14	2026-09-28 06:31:41.75702	1	2026-09-28 06:35:51.797055	1	t	/admin/menu-management/gdtest
20	Estimate2	estimate2	Layers	\N	13	2026-09-28 06:26:38.269182	4	2026-09-28 06:36:04.973549	1	t	/admin/menu-management/gdtest
\.


--
-- Data for Name: mst_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_permissions (permission_id, permission_name, permission_key, description, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
3	Edit	edit	\N	2026-09-23 13:05:09.444327	1	\N	\N	t
4	Delete	delete	\N	2026-09-23 13:05:09.444327	1	\N	\N	t
5	Approve	approve	\N	2026-09-23 13:05:09.444327	1	\N	\N	t
6	Reject	reject	\N	2026-09-23 13:05:09.444327	1	\N	\N	t
7	Import	import	\N	2026-09-23 13:05:09.444327	1	\N	\N	t
8	Export	export	\N	2026-09-23 13:05:09.444327	1	\N	\N	t
1	View	view	\N	2026-09-23 13:05:09.444327	1	2026-09-24 07:26:45.865118	10	t
2	Add	add	\N	2026-09-23 13:05:09.444327	1	2026-09-25 11:23:56.653186	4	t
\.


--
-- Data for Name: mst_permissions_tracker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_permissions_tracker (tracker_id, permission_id, permission_name, permission_key, description, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
1	3	Create Opportunity	create.opportunity	User can create the opportunity.	2026-09-21 11:18:30.010145	4	2026-09-22 09:10:10.281437	8	f
2	3	Create Opportunity	create.opportunity	User can create the opportunity.	2026-09-21 11:18:30.010145	4	2026-09-22 09:10:12.914308	8	t
3	6	Download	download	Download data	2026-09-22 10:10:45.458081	8	\N	\N	t
4	6	Downloads	download	Download data	2026-09-22 10:10:45.458081	8	2026-09-22 10:12:19.084674	8	t
5	6	Downloads	download	Downloadss data	2026-09-22 10:10:45.458081	8	2026-09-22 10:12:44.882263	8	t
6	1	View Dashboard	view_dashboard	Allows viewing the dashboard	2026-09-18 10:19:24.006168	1	2026-09-22 10:29:34.033663	8	f
7	1	View Dashboard	view_dashboard	Allows viewing the dashboard	2026-09-18 10:19:24.006168	1	2026-09-22 10:29:37.453161	8	t
8	1	View Dashboard	view_dashboard	Allows viewing the dashboard	2026-09-18 10:19:24.006168	1	2026-09-22 10:36:22.653908	8	f
9	7	Downloads	downloads	\N	2026-09-22 10:36:48.789653	1	\N	\N	t
10	1	View Dashboard	view_dashboard	Allows viewing the dashboard	2026-09-18 10:19:24.006168	1	2026-09-22 11:01:11.257582	4	t
11	1	View Dashboard	view_dashboard	Allows viewing the dashboard	2026-09-18 10:19:24.006168	1	2026-09-22 11:01:12.597916	4	f
12	8	download	download_w	\N	2026-09-23 12:20:50.181563	1	\N	\N	t
13	1	View	view	\N	2026-09-23 13:05:09.444327	1	2026-09-24 07:26:44.661969	10	f
14	1	View	view	\N	2026-09-23 13:05:09.444327	1	2026-09-24 07:26:45.865118	10	t
15	2	Add	add	\N	2026-09-23 13:05:09.444327	1	2026-09-25 06:56:59.822821	1	f
16	2	Add	add	\N	2026-09-23 13:05:09.444327	1	2026-09-25 09:34:30.649541	4	t
17	2	Add	add	\N	2026-09-23 13:05:09.444327	1	2026-09-25 11:23:55.841189	4	f
18	2	Add	add	\N	2026-09-23 13:05:09.444327	1	2026-09-25 11:23:56.653186	4	t
\.


--
-- Data for Name: mst_proposal_section; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_proposal_section (proposal_section_id, section_name, section_description, display_order, is_active, created_dt, created_by, updated_dt, updated_by) FROM stdin;
\.


--
-- Data for Name: mst_rate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_rate (ratemaster_id, role_name, role_code, rate_type, currency_id, default_rate, location, description, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
1	Developer	dev	Monthly	1	56773.00	Pune	developer rate	2026-09-28 10:47:38.267947	10	2026-09-28 10:48:52.366962	10	t
2	Project Manager	PM	Monthly	14	435435.00	Pune	rate	2026-09-28 10:49:32.859295	10	\N	\N	t
3	Bussiness Analyst	BA	Monthly	6	345465.00	Pune	rate	2026-09-28 11:06:25.799277	10	\N	\N	t
\.


--
-- Data for Name: mst_rate_tracker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_rate_tracker (tracker_id, ratemaster_id, role_name, role_code, rate_type, currency_id, default_rate, location, description, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
1	1	Devloper	dev	Weekly	1	56773.00	Pune	devlopers rate	2026-09-28 10:47:38.267	10	\N	\N	t
2	1	Devloper	dev	Monthly	1	56773.00	Pune	devlopers rate	2026-09-28 10:47:38.267	10	2026-09-28 10:47:59.538	10	t
3	1	Developer	dev	Monthly	1	56773.00	Pune	developer rate	2026-09-28 10:47:38.267	10	2026-09-28 10:48:52.366	10	t
4	2	Project Manager	PM	Monthly	14	435435.00	Pune	rate	2026-09-28 10:49:32.859	10	\N	\N	t
5	3	Bussiness Analyst	BA	Monthly	6	345465.00	Pune	rate	2026-09-28 11:06:25.799	10	\N	\N	t
\.


--
-- Data for Name: mst_rfp_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_rfp_questions (question_id, question, description, display_order, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
2	jfj	jhq	2	2026-09-23 10:14:04.309506	8	2026-09-23 10:14:17.32507	8	t
3	Technical approach & solution	Technical approach & solution	3	2026-09-23 10:49:58.804906	8	\N	\N	t
1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-24 05:21:50.361382	1	t
4	News & Press	News & Press	4	2026-09-28 04:52:55.816912	8	\N	\N	t
\.


--
-- Data for Name: mst_rfp_questions_tracker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_rfp_questions_tracker (tracker_id, question_id, question, description, display_order, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
1	1	test q	tested	\N	2026-09-23 08:03:16.054403	1	\N	\N	t
2	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-23 08:03:20.149206	1	t
3	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-23 08:03:28.081388	1	f
4	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-23 08:03:30.937702	1	t
5	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-23 08:03:34.597247	1	f
6	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-23 08:03:38.917641	1	t
7	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-23 08:03:42.701399	1	f
8	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-23 08:03:50.037525	1	t
9	2	jfj	jhq	2	2026-09-23 10:14:04.309506	8	\N	\N	t
10	2	jfj	jhq	2	2026-09-23 10:14:04.309506	8	2026-09-23 10:14:12.381048	8	f
11	2	jfj	jhq	2	2026-09-23 10:14:04.309506	8	2026-09-23 10:14:17.32507	8	t
12	3	Technical approach & solution	Technical approach & solution	3	2026-09-23 10:49:58.804906	8	\N	\N	t
13	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-24 05:21:49.179234	1	f
14	1	test q	tested	1	2026-09-23 08:03:16.054403	1	2026-09-24 05:21:50.361382	1	t
15	4	News & Press	News & Press	4	2026-09-28 04:52:55.816912	8	\N	\N	t
\.


--
-- Data for Name: mst_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_roles (role_id, role_name, role_code, description, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
20	Sales Head	SH	Sales Head	2026-09-22 11:01:54.66915	8	\N	\N	t
9	Admin	Admin	tested	2026-09-17 10:54:10.010528	\N	2026-09-23 06:18:27.16921	1	t
22	Estimation Team	estimation_team	Technical team who will do the estimation	2026-09-24 10:19:14.641068	9	\N	\N	t
23	CEO/Gate-2 Approver	approver_gate2	Approver/CEO	2026-09-24 10:19:45.937397	9	\N	\N	t
24	Sales Representative	sales_representative	Sales representative	2026-09-24 10:20:38.560951	9	\N	\N	t
15	Super Admin	super_admin	Full system access	2026-09-21 10:30:04.644875	\N	\N	\N	t
7	Viewer	abc	okay	2026-09-17 10:30:54.370479	\N	2026-09-28 07:31:06.154186	10	t
21	Sales Manager	SM	okay	2026-09-22 11:04:39.805091	8	2026-09-28 07:32:40.286767	10	t
25	Editor	editor	allow to edit	2026-09-28 07:33:53.906401	10	\N	\N	t
\.


--
-- Data for Name: mst_roles_tracker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_roles_tracker (tracker_id, role_id, role_name, role_code, description, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
1	16	Sales Head	SH	Sales Head	2026-09-22 10:37:28.957217	8	\N	\N	t
2	17	Manager	SM	Sales Manager	2026-09-22 10:41:16.264972	8	\N	\N	f
3	17	Manager	SM	Sales Manager	2026-09-22 10:41:16.264972	8	2026-09-22 10:41:32.884997	8	t
4	17	Manager	SM	Sales Manager	2026-09-22 10:41:16.264972	8	2026-09-22 10:43:41.188162	1	f
5	18	gd	gd	test	2026-09-22 10:43:56.617466	1	\N	\N	t
6	18	gd	gd	test	2026-09-22 10:43:56.617466	1	2026-09-22 10:44:02.058685	1	f
7	16	Sales Head	SH	Sales Head	2026-09-22 10:37:28.957217	8	2026-09-22 10:44:57.571757	8	f
8	19	Review	RV	Reviewer	2026-09-22 10:46:02.281334	8	\N	\N	t
9	19	Review	RV	Reviewer	2026-09-22 10:46:02.281334	8	2026-09-22 10:46:14.327029	8	f
10	13	Admin234	ADMIN23	Full system access2	2026-09-21 09:36:41.209322	\N	2026-09-22 10:53:59.31697	8	t
11	20	Sales Head	SH	Sales Head	2026-09-22 11:01:54.66915	8	\N	\N	t
12	21	Sales Manager	SM	Sales Manager	2026-09-22 11:04:39.805091	8	\N	\N	t
13	9	Admin	\N	tested	2026-09-17 10:54:10.010528	\N	2026-09-22 11:23:31.065694	8	t
14	9	Admin	Admin1	tested	2026-09-17 10:54:10.010528	\N	2026-09-22 13:59:10.24542	1	t
15	9	Admin	Admin	tested	2026-09-17 10:54:10.010528	\N	2026-09-23 06:18:27.16921	1	t
16	22	Estimation Team	estimation_team	Technical team who will do the estimation	2026-09-24 10:19:14.641068	9	\N	\N	t
17	23	CEO/Gate-2 Approver	approver_gate2	Approver/CEO	2026-09-24 10:19:45.937397	9	\N	\N	t
18	24	Sales Representative	sales_representative	Sales representative	2026-09-24 10:20:38.560951	9	\N	\N	t
19	4	Adminnss	ADMINnss	Full system accessss	2026-09-17 06:45:00.897097	\N	2026-09-25 09:34:58.372866	4	f
20	13	Admin234	ADMIN23	Full system access2	2026-09-21 09:36:41.209322	\N	2026-09-25 09:35:01.640076	4	f
21	12	Admin2	ADMIN2	Full system access2	2026-09-21 09:25:45.681107	\N	2026-09-25 09:35:05.495914	4	f
22	5	Admin123	ADMINns	Full system accessss	2026-09-17 09:42:07.577708	\N	2026-09-25 09:35:08.243811	4	f
23	14	Admin11	ADMIN11	Full system access	2026-09-21 09:38:53.317537	\N	2026-09-25 09:35:14.683239	4	f
24	11	shhhhhh	\N	\N	2026-09-18 12:51:39.454088	\N	2026-09-25 09:36:17.598312	4	f
25	7	Viewer	abc	na	2026-09-17 10:30:54.370479	\N	2026-09-28 07:30:34.578579	10	t
26	7	Viewer	abc	okay	2026-09-17 10:30:54.370479	\N	2026-09-28 07:31:06.154186	10	t
27	21	Sales Manager	SM	okay	2026-09-22 11:04:39.805091	8	2026-09-28 07:32:40.286767	10	t
28	25	Editor	editor	allow to edit	2026-09-28 07:33:53.906401	10	\N	\N	t
\.


--
-- Data for Name: mst_stage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_stage (stage_id, stage_name, description, win_percentage, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
\.


--
-- Data for Name: mst_stage_tracker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_stage_tracker (stage_tracker_id, previous_stage_id, stage_name, description, win_percentage, created_dt, created_by, updated_dt, updated_by, is_current) FROM stdin;
\.


--
-- Data for Name: mst_sub_stage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_sub_stage (sub_stage_id, stage_id, sub_stage_name, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
\.


--
-- Data for Name: mst_sub_stage_tracker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_sub_stage_tracker (sub_stage_id_tracker, sub_stage_id, stage_id, sub_stage_name, created_dt, created_by, updated_dt, updated_by, is_current) FROM stdin;
\.


--
-- Data for Name: mst_user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mst_user (user_id, first_name, last_name, email, password_hash, role_id, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
1	Admin	User	gdhawale@xtsworld.in	2f564e0f681ef743fb61e3b2234c79e6:b22d3bdbeae2f7ac7bc7328e5aeb3d871eedb0bff83167f3a9a5ea7a39b1c06e70cede090e481334e419bee56307a7cad22c4146122c27ef8df22d1d225e1402	15	2026-09-16 12:59:57.16991	\N	2026-09-28 08:01:55.364889	1	t
14	TestUser	TestUser	testuser@user.com	be07532589dbf5736a921272c678d8a4:f67ac55dde2550baf07a4980f8cf67a6ad5e3e3500b4604a6d17bffc997c640b56896370290dc4fa3f3a30ca4c68654a209caa5910e2ff1bbc3ced8b31a0d38e	\N	2026-09-24 13:31:51.827253	\N	\N	\N	t
9	Test	Test	test@test.com	1a971b313e1957d920a5297e52423b9c:8cf497f3e539b4e41915d645d81612cee40045b446c827148aa0c8357e9548862bd8e23adcaa37c989baf95a8b416e4c3de72e9b2d27bb73ce37a013a6726946	23	2026-09-24 05:39:40.537718	\N	2026-09-25 09:28:43.753002	4	t
7	Gayatri	Gunjakar	gayatri@xtsworld.in	809df162b6adabc583204a151c89a17a:818bd9b75ba042dfb3cca41093bd29cd745693266c7807e111bcbf90c65bd62374dadcac76e86dee5a2ae0046672db3ef4e271e56853a07410352f75ac00d70f	7	2026-09-22 05:24:20.431449	\N	2026-09-22 09:19:52.564097	1	t
10	user	user	user@user.com	3fe297c518f12675f4ad586475f16ee6:4bfa75f20d412a1046b9961cec8589fd2eb5a976f9996f62de205aa8d705f9b0bf8a53a19febc5d3d2bece0ed4dae749adfab6278c09bf1e34848a128d7fc242	24	2026-09-24 06:47:33.136078	\N	2026-09-25 09:28:44.202379	4	t
11	user1	user1	user1@user1.com	9bcd0d14eca219dd59f52ad4f3e65f82:f02149f9205071d6affc5ef27cffecb45362546b7cac97511bce724bb8e8b54615919171c81c9a712202cf273f860c1c7d1570009da58005edb8dadfcbb10d3c	20	2026-09-24 10:08:39.086971	\N	2026-09-25 09:28:44.923044	4	t
2	Test2	User	test2@example.com	59f848df9e4914e9413a8f71891bb95d:4e8a454f6c974fa8598ebd5a2d9e69310f58fb60ba12536ed5a076ccf3019309da12c006ad8202768afc5c077c4d2d2077eb90a8bfd7e54e13942aabaa8a0e3f	7	2026-09-16 13:04:03.331693	\N	2026-09-22 11:07:14.700032	8	t
5	Asha	Patil	asha@asha.com	238f90c891daddd97b642e90144df27f:2472af66ca4f806fe278f97e8cea6f03d02f0a73f55ab8c98f07e733536959c653749b374cb47a8be42f0af69e139195c5c9afc049f3015253282e5c7c574466	9	2026-09-21 09:37:48.779878	\N	2026-09-22 05:46:39.763503	1	t
12	user2	user2	user2@user2.com	d2cc67f3d9a7fed617b5f3d1943c0728:32fed151b516372fc3ccaf5933283d4a0ffe690a3918093be5c1b625335a7a69d7cb6f6126f50d456d6bf70c06fa080475e30f090b0d28a6f3d13ac54bd568c2	22	2026-09-24 10:11:30.722619	\N	2026-09-25 09:29:00.301618	4	t
3	John	Doe	john.doe@example.com	09ef2b46156da22f12560cc06754c763:eed5d976d306481e705d5d3d3c2d0149fd696288b78545c7e533455c0f4cb196329c30943e11becd2e86c3ada0474f624ea08cb22a7d813091c57c3168918b69	20	2026-09-16 13:12:14.508145	\N	2026-09-23 11:03:35.050249	1	t
8	Parikshit	Nagpurkar	pnagpurkar@xtsworld.in	75eb190beef8cfab15cfec9075384d83:e2889ecf1e931e9d40e8215ffe493b1f5d3c21bb9d2a983848a16b2d3952fc8e35eca62e348b405b41f42415ad76f1fffad74d6c218b167ace42d2208c3f0fba	20	2026-09-22 08:46:55.224693	\N	2026-09-24 06:03:27.156488	1	t
13	test3	test3	test3@test3.com	7ff57f27e09e01b19b72cb1ef3cdd122:08fb210fb54c406cf3a7cb14152b8d64f8f034bcddf751ceb613b8a1ae3548eeab585e781d2c11e76049af43e2829d215389b3c81575f03b9caa01c8dd771d63	7	2026-09-24 12:29:39.440065	\N	2026-09-25 09:30:04.646301	4	t
6	Asha	Patil	asha1@asha.com	c147b7548639c8ac827b375595ac8193:2e5152f02139b74af31b9a7b5ad3bd1abe33a7409a4e4965c8c6a7f0ed1ebb73bf421873421cc1a6007dce42dccf2cc7271865c58a035f6895cac15db99036fa	9	2026-09-21 10:29:53.157789	\N	2026-09-25 11:24:34.68658	4	t
15	User3	User	user3@user.com	d454a80fa6de1b07cec911629f9749e0:a858f2861e585f3455948979b0cfa82ac6a976f6949eccaee59ed59449a5d890afc681a691d94a1c5160354e7f15d2009c66ee20b777104af926a3cf0277baab	15	2026-09-28 06:14:20.692414	\N	2026-09-28 06:15:43.562011	4	t
4	Bhushan	Dixit	bdixit@xtsworld.in	3f67316a8ffcb27dcf39e8e4e7ecf732:0919d489ded53e7b2d783ff01d6e56d07e4eff33b1419c7549c6dfc0c4cd237ed42dbbb02b0a92e640b9087e13716ed3f010f9ba410b9c39610b68f612e9fc60\r\n	15	2026-09-17 08:29:10.083055	\N	2026-09-24 07:22:03.026199	9	t
16	User4	User	user4@user.com	ec6ee08c64ec59e8a2418a7074d3f8c5:dfa6eb0ce5aa13a712736084775f795afec4afa582d77982e1c4b2ab16e53c82412acc403f2e03a4e29dbfbeb3a69f592d28ca7bdd8a982bd6d040fb1c5632b9	7	2026-09-28 06:18:38.924185	\N	2026-09-28 06:19:03.155523	4	t
\.


--
-- Data for Name: password_reset_token; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_token (token_id, user_id, token_hash, expires_at, used_at, created_dt) FROM stdin;
1	1	6b94aa540d575082bc5e81f6fb2100544546fb489960d5a1d081ca098c1d6923	2026-09-24 17:37:56.419	\N	2026-09-24 11:37:59.194838
2	1	dc15bbc2bff6518fd14a509e9a78d515c4831db8616b64c9d748a8ef9a217dcb	2026-09-24 17:38:25.375	\N	2026-09-24 11:38:28.150518
3	1	e6ead3327947a9609a3bf5ce12979b33ca62852a1cc922c61c0b0db193f7ad40	2026-09-24 17:40:46.714	\N	2026-09-24 11:40:49.491785
4	1	60b3b54427f26e515c175f42e34acf783588889b2075e9187b13ec2852a42336	2026-09-24 17:41:37.577	\N	2026-09-24 11:41:40.354577
5	1	e4d1c01b7b046b26101cdcc61ca47101a427a1f5516958462417f9dd4871f8a4	2026-09-24 17:42:52.657	2026-09-24 11:43:11.266922	2026-09-24 11:42:55.436186
6	1	3be48c49148b2a5d9aaf4ba788224eafd2a27e5071367feaa640063defe71993	2026-09-24 17:44:40.072	\N	2026-09-24 11:44:42.852005
7	1	c8de120f886e8a3035dfda22050cada697b852214ee12ee2d67612b1246086bf	2026-09-24 17:47:43.285	\N	2026-09-24 11:47:46.067368
8	1	a527a03318b7fb8b214a8f1b7ab8ea04121189176926265d3938ad93dc79956f	2026-09-24 17:54:37.149	\N	2026-09-24 11:54:39.934505
9	1	0fc2a408839f72bc72a23a68c94ac957cb1e4c4f9eaca84f6d30300e37386ddd	2026-09-24 17:59:47.628	\N	2026-09-24 11:59:50.416314
10	1	0773a36b2b7f1cafd5762b503ff0f86e613b01f364d8cf77c453056ba7ac8eda	2026-09-24 18:00:44.199	\N	2026-09-24 12:00:46.986888
11	1	dd47b0a85a67260ebd4f09dfc8a5a50b3c48b7d26d996f01e0e9dd259e20e6e5	2026-09-24 18:03:40.418	\N	2026-09-24 12:03:43.207388
12	1	d753fbbf87c91f43b4aacfba49d50e52bc17fcf9b9b2d987e914b35baa96edfd	2026-09-24 18:04:24.249	\N	2026-09-24 12:04:27.039777
13	1	8716da28562bdf958c22caa934c3bde7f98413946e4ccfd6c7d9d6a11b899b03	2026-09-24 18:39:35.947	\N	2026-09-24 12:39:38.764042
14	1	406874627cc25331cad61e593919a4748571090748efd5e284b6b4f44957ab3e	2026-09-24 18:42:42.591	\N	2026-09-24 12:42:45.410821
15	1	13f7a5fb729b2685767b6c6247de9c2cdc4e8f4a48664539aebebe6bd4391ae6	2026-09-24 18:45:05.119	2026-09-24 12:45:46.414856	2026-09-24 12:45:07.940304
16	1	70686803d7e7427414edffa949b6da7e3b35ca1daf6b341877dad8452c4e6924	2026-09-24 18:47:13.843	2026-09-24 12:47:41.505016	2026-09-24 12:47:16.666581
17	1	d63c5331228742471dc7973c21bc699afa22482c1b923d39d0c484c1ac7ab04b	2026-09-24 18:47:59.795	\N	2026-09-24 12:48:02.619088
18	1	b0c585638a298f02f4a3a5e60ea4b443e2f25c30730934ee24d65d60e685f3ca	2026-09-24 18:20:45.323	2026-09-24 12:51:06.35145	2026-09-24 12:50:18.148135
19	1	f4c1ea1dbe6ee2edacf232db1f64f4779b8574c12192aab5fc3181726702fafc	2026-09-24 12:53:52.084996	\N	2026-09-24 12:53:22.084996
20	1	ce711f5d69c365752bd6d69a2c12a02a41d0d74ae16f4b476dab7a17d545d56e	2026-09-24 13:27:56.935411	\N	2026-09-24 12:57:56.935411
21	1	71b93f7a6f5d9c1d6e5d353753f4607a8aa54afa028df2419b6e827bf95278eb	2026-09-24 13:00:54.355815	\N	2026-09-24 13:00:24.355815
22	1	b09f4a3e8bacf576669eb6f5df43a9504aad333c16366a6c9c5a93f9052aa2e0	2026-09-24 13:02:36.996851	\N	2026-09-24 13:02:06.996851
23	1	fd29eaa2cc4f44e4a9a41d0d20977a5af6e87d74b11f0682a3d4ba90d1a1e970	2026-09-24 13:09:05.029397	2026-09-24 13:08:52.012319	2026-09-24 13:08:35.029397
24	1	25efb8e1c9ba7e31436db08e9b2a1c123eee3ffad00f3f84abf12cb7b3d647af	2026-09-28 08:30:21.709819	2026-09-28 08:00:53.323519	2026-09-28 08:00:21.709819
\.


--
-- Data for Name: tbl_estimation_phases_tracker; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tbl_estimation_phases_tracker (phase_tracker_id, phase_id, phase_name, phase_code, opportunity_id, description, display_order, created_dt, created_by, updated_dt, updated_by, is_current) FROM stdin;
1	1	phase1	123	\N	test	1	2026-09-22 14:11:25.001531	1	\N	\N	t
2	1	phase1	123	\N	test	2	2026-09-22 14:11:25.001531	1	2026-09-22 14:11:35.105154	1	t
3	2	phase2	\N	\N	\N	\N	2026-09-22 14:12:40.45416	1	\N	\N	f
4	2	phase2	\N	\N	\N	\N	2026-09-22 14:12:40.45416	1	2026-09-22 14:12:47.953302	1	f
5	3	phase11	\N	\N	\N	\N	2026-09-22 14:13:08.646666	1	\N	\N	t
6	3	phase11	\N	\N	\N	\N	2026-09-22 14:13:08.646666	1	2026-09-22 14:16:25.177277	1	f
7	4	oyyi	j	\N	\N	\N	2026-09-23 05:39:26.79731	1	\N	\N	t
8	5	wqer	1	\N	\N	2	2026-09-23 06:17:22.681236	1	\N	\N	t
9	3	phase11	234	\N	234	3	2026-09-22 14:13:08.646666	1	2026-09-23 06:21:26.481457	1	t
10	1	phase1	123	\N	test	1	2026-09-22 14:11:25.001531	1	2026-09-23 07:39:46.453142	1	t
11	4	oyyi	j	\N	\N	\N	2026-09-23 05:39:26.79731	1	2026-09-23 07:39:52.749225	1	t
12	6	Discovery & Design	\N	\N	Discovery & Design	4	2026-09-23 10:39:36.197144	8	\N	\N	t
13	6	Discovery & Design	\N	\N	Discovery & Design	4	2026-09-23 10:39:36.197144	8	2026-09-23 10:39:52.762074	8	f
14	4	oyyi	j	\N	\N	\N	2026-09-23 05:39:26.79731	1	2026-09-23 10:43:48.084897	8	f
15	7	UX Planning and Wireframing	\N	\N	UX Planning and Wireframing	4	2026-09-23 10:47:25.680879	8	\N	\N	t
16	1	Discovery & Design	123	\N	test	1	2026-09-22 14:11:25.001531	1	2026-09-24 05:06:30.9007	8	t
17	5	UI Design	1	\N	\N	2	2026-09-23 06:17:22.681236	1	2026-09-24 05:06:41.560612	8	t
18	3	Website Setup	234	\N	234	3	2026-09-22 14:13:08.646666	1	2026-09-24 05:06:52.084875	8	t
19	4	Homepage	\N	\N	\N	\N	2026-09-23 05:39:26.79731	1	2026-09-24 05:07:17.133142	8	f
20	1	Discovery & Design	DD	\N	Discovery & Design	1	2026-09-22 14:11:25.001531	1	2026-09-24 05:07:42.196806	8	t
21	5	UI Design	UD	\N	UI Design	2	2026-09-23 06:17:22.681236	1	2026-09-24 05:07:54.372636	8	t
22	3	Website Setup	WS	\N	Website Setup	3	2026-09-22 14:13:08.646666	1	2026-09-24 05:09:35.672695	8	t
23	7	UX Planning and Wireframing	UXW	\N	UX Planning and Wireframing	4	2026-09-23 10:47:25.680879	8	2026-09-24 05:10:03.948999	8	t
24	4	Homepage	HP	\N	Homepage	6	2026-09-23 05:39:26.79731	1	2026-09-24 05:10:26.029008	8	f
25	8	Get Help	GH	\N	Get Help	7	2026-09-24 05:10:55.092627	8	\N	\N	t
26	4	Homepage	HP	\N	Homepage	5	2026-09-23 05:39:26.79731	1	2026-09-24 05:11:00.828983	8	f
27	8	Get Help	GH	\N	Get Help	6	2026-09-24 05:10:55.092627	8	2026-09-24 05:11:06.972939	8	t
28	9	CED Law	CL	\N	CED Law	7	2026-09-24 05:11:41.428668	8	\N	\N	t
29	10	Careers	CR	\N	Careers	8	2026-09-24 05:11:57.19244	8	\N	\N	t
\.


--
-- Data for Name: tbl_menuwise_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tbl_menuwise_permission (id, menu_id, permission_id, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
287	4	2	2026-09-28 05:18:44.353259	1	\N	\N	t
288	4	5	2026-09-28 05:18:44.353259	1	\N	\N	t
289	4	4	2026-09-28 05:18:44.353259	1	\N	\N	t
290	4	8	2026-09-28 05:18:44.353259	1	\N	\N	t
291	4	6	2026-09-28 05:18:44.353259	1	\N	\N	t
292	4	1	2026-09-28 05:18:44.353259	1	\N	\N	t
293	4	3	2026-09-28 05:18:44.353259	1	\N	\N	t
295	20	2	2026-09-28 06:29:16.289101	1	\N	\N	t
296	20	1	2026-09-28 06:29:16.289101	1	\N	\N	t
297	21	2	2026-09-28 06:32:01.393163	1	\N	\N	t
298	21	1	2026-09-28 06:32:01.393163	1	\N	\N	t
299	1	1	2026-09-28 10:04:38.414947	1	\N	\N	t
216	7	2	2026-09-25 11:21:53.132809	4	\N	\N	t
217	7	5	2026-09-25 11:21:53.132809	4	\N	\N	t
218	7	4	2026-09-25 11:21:53.132809	4	\N	\N	t
219	7	3	2026-09-25 11:21:53.132809	4	\N	\N	t
220	7	8	2026-09-25 11:21:53.132809	4	\N	\N	t
221	7	7	2026-09-25 11:21:53.132809	4	\N	\N	t
222	7	6	2026-09-25 11:21:53.132809	4	\N	\N	t
223	7	1	2026-09-25 11:21:53.132809	4	\N	\N	t
224	10	2	2026-09-25 11:21:58.232769	4	\N	\N	t
225	10	5	2026-09-25 11:21:58.232769	4	\N	\N	t
226	10	4	2026-09-25 11:21:58.232769	4	\N	\N	t
227	10	3	2026-09-25 11:21:58.232769	4	\N	\N	t
228	10	8	2026-09-25 11:21:58.232769	4	\N	\N	t
229	10	7	2026-09-25 11:21:58.232769	4	\N	\N	t
230	10	6	2026-09-25 11:21:58.232769	4	\N	\N	t
231	10	1	2026-09-25 11:21:58.232769	4	\N	\N	t
232	2	2	2026-09-25 11:22:08.444764	4	\N	\N	t
233	2	5	2026-09-25 11:22:08.444764	4	\N	\N	t
234	2	4	2026-09-25 11:22:08.444764	4	\N	\N	t
235	2	3	2026-09-25 11:22:08.444764	4	\N	\N	t
236	2	8	2026-09-25 11:22:08.444764	4	\N	\N	t
237	2	7	2026-09-25 11:22:08.444764	4	\N	\N	t
238	2	6	2026-09-25 11:22:08.444764	4	\N	\N	t
239	2	1	2026-09-25 11:22:08.444764	4	\N	\N	t
240	5	2	2026-09-25 11:22:14.624612	4	\N	\N	t
241	5	5	2026-09-25 11:22:14.624612	4	\N	\N	t
242	5	4	2026-09-25 11:22:14.624612	4	\N	\N	t
243	5	3	2026-09-25 11:22:14.624612	4	\N	\N	t
244	5	8	2026-09-25 11:22:14.624612	4	\N	\N	t
245	5	7	2026-09-25 11:22:14.624612	4	\N	\N	t
246	5	6	2026-09-25 11:22:14.624612	4	\N	\N	t
247	5	1	2026-09-25 11:22:14.624612	4	\N	\N	t
248	8	2	2026-09-25 11:22:20.549391	4	\N	\N	t
249	8	5	2026-09-25 11:22:20.549391	4	\N	\N	t
250	8	4	2026-09-25 11:22:20.549391	4	\N	\N	t
251	8	3	2026-09-25 11:22:20.549391	4	\N	\N	t
252	8	8	2026-09-25 11:22:20.549391	4	\N	\N	t
253	8	7	2026-09-25 11:22:20.549391	4	\N	\N	t
254	8	6	2026-09-25 11:22:20.549391	4	\N	\N	t
255	8	1	2026-09-25 11:22:20.549391	4	\N	\N	t
256	6	2	2026-09-25 11:22:27.960782	4	\N	\N	t
257	6	5	2026-09-25 11:22:27.960782	4	\N	\N	t
258	6	4	2026-09-25 11:22:27.960782	4	\N	\N	t
259	6	3	2026-09-25 11:22:27.960782	4	\N	\N	t
260	6	8	2026-09-25 11:22:27.960782	4	\N	\N	t
261	6	7	2026-09-25 11:22:27.960782	4	\N	\N	t
262	6	6	2026-09-25 11:22:27.960782	4	\N	\N	t
263	6	1	2026-09-25 11:22:27.960782	4	\N	\N	t
264	9	2	2026-09-25 11:22:34.228476	4	\N	\N	t
265	9	5	2026-09-25 11:22:34.228476	4	\N	\N	t
266	9	4	2026-09-25 11:22:34.228476	4	\N	\N	t
267	9	3	2026-09-25 11:22:34.228476	4	\N	\N	t
268	9	8	2026-09-25 11:22:34.228476	4	\N	\N	t
269	9	7	2026-09-25 11:22:34.228476	4	\N	\N	t
270	9	6	2026-09-25 11:22:34.228476	4	\N	\N	t
271	9	1	2026-09-25 11:22:34.228476	4	\N	\N	t
277	11	2	2026-09-28 05:09:38.874792	1	\N	\N	t
278	11	4	2026-09-28 05:09:38.874792	1	\N	\N	t
279	11	3	2026-09-28 05:09:38.874792	1	\N	\N	t
280	11	1	2026-09-28 05:09:38.874792	1	\N	\N	t
\.


--
-- Data for Name: tbl_reason_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tbl_reason_codes (reason_code_id, reason_name, reason_category, description, is_active, created_dt, created_by, updated_dt, updated_by) FROM stdin;
\.


--
-- Data for Name: tbl_role_menu_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tbl_role_menu_permission (id, role_id, menu_id, permission_id, created_dt, created_by, updated_dt, updated_by, is_active) FROM stdin;
7	15	9	1	2026-09-25 09:23:00.152165	1	2026-09-25 11:23:41.813984	4	t
199	15	4	8	2026-09-25 11:23:01.43853	4	2026-09-28 05:24:20.437267	1	f
164	24	5	4	2026-09-25 10:19:59.548984	4	2026-09-25 10:26:19.577206	4	f
163	24	5	1	2026-09-25 09:42:21.329589	4	2026-09-25 10:27:48.396979	4	f
200	15	4	7	2026-09-25 11:23:01.535644	4	2026-09-28 04:51:15.312975	8	f
166	24	6	1	2026-09-25 10:25:17.590718	4	2026-09-25 11:07:41.325439	4	t
201	15	4	6	2026-09-25 11:23:01.632999	4	2026-09-28 05:24:20.437267	1	f
165	24	6	3	2026-09-25 10:25:17.540698	4	2026-09-25 11:08:37.973526	4	f
259	15	11	2	2026-09-28 05:12:16.513602	1	\N	\N	t
195	15	4	2	2026-09-25 11:23:01.049178	4	\N	\N	t
196	15	4	5	2026-09-25 11:23:01.146268	4	\N	\N	t
197	15	4	4	2026-09-25 11:23:01.243649	4	\N	\N	t
203	15	7	2	2026-09-25 11:23:07.153697	4	\N	\N	t
204	15	7	5	2026-09-25 11:23:07.221095	4	\N	\N	t
205	15	7	4	2026-09-25 11:23:07.317847	4	\N	\N	t
206	15	7	3	2026-09-25 11:23:07.827976	4	\N	\N	t
207	15	7	8	2026-09-25 11:23:07.832601	4	\N	\N	t
208	15	7	7	2026-09-25 11:23:07.878152	4	\N	\N	t
209	15	7	6	2026-09-25 11:23:07.92309	4	\N	\N	t
4	15	7	1	2026-09-25 09:20:00.966707	1	2026-09-25 11:23:07.971024	4	t
211	15	10	2	2026-09-25 11:23:12.561223	4	\N	\N	t
212	15	10	5	2026-09-25 11:23:12.633869	4	\N	\N	t
213	15	10	4	2026-09-25 11:23:12.677736	4	\N	\N	t
214	15	10	3	2026-09-25 11:23:12.722025	4	\N	\N	t
215	15	10	8	2026-09-25 11:23:12.766469	4	\N	\N	t
216	15	10	7	2026-09-25 11:23:12.814087	4	\N	\N	t
217	15	10	6	2026-09-25 11:23:12.858375	4	\N	\N	t
218	15	10	1	2026-09-25 11:23:12.906459	4	\N	\N	t
219	15	2	2	2026-09-25 11:23:17.880527	4	\N	\N	t
220	15	2	5	2026-09-25 11:23:17.9876	4	\N	\N	t
221	15	2	4	2026-09-25 11:23:18.091995	4	\N	\N	t
222	15	2	3	2026-09-25 11:23:18.095728	4	\N	\N	t
223	15	2	8	2026-09-25 11:23:18.141916	4	\N	\N	t
224	15	2	7	2026-09-25 11:23:18.185891	4	\N	\N	t
225	15	2	6	2026-09-25 11:23:18.229956	4	\N	\N	t
2	15	2	1	2026-09-25 09:18:10.463203	1	2026-09-25 11:23:18.274663	4	t
227	15	5	2	2026-09-25 11:23:24.02464	4	\N	\N	t
228	15	5	5	2026-09-25 11:23:24.073991	4	\N	\N	t
229	15	5	4	2026-09-25 11:23:24.122781	4	\N	\N	t
230	15	5	3	2026-09-25 11:23:24.16967	4	\N	\N	t
231	15	5	8	2026-09-25 11:23:24.213788	4	\N	\N	t
232	15	5	7	2026-09-25 11:23:24.257563	4	\N	\N	t
233	15	5	6	2026-09-25 11:23:24.309112	4	\N	\N	t
6	15	5	1	2026-09-25 09:22:35.779675	1	2026-09-25 11:23:24.353502	4	t
168	15	8	2	2026-09-25 11:03:38.523054	4	2026-09-25 11:23:30.868395	4	t
169	15	8	5	2026-09-25 11:03:38.573607	4	2026-09-25 11:23:30.950415	4	t
170	15	8	4	2026-09-25 11:03:38.618832	4	2026-09-25 11:23:31.047463	4	t
171	15	8	3	2026-09-25 11:03:38.666322	4	2026-09-25 11:23:31.144562	4	t
172	15	8	8	2026-09-25 11:03:38.710786	4	2026-09-25 11:23:31.241964	4	t
173	15	8	7	2026-09-25 11:03:38.758686	4	2026-09-25 11:23:31.338808	4	t
174	15	8	6	2026-09-25 11:03:38.806548	4	2026-09-25 11:23:31.435307	4	t
5	15	8	1	2026-09-25 09:21:00.09553	1	2026-09-25 11:23:31.532749	4	t
179	15	6	2	2026-09-25 11:20:38.646355	4	2026-09-25 11:23:36.036369	4	t
180	15	6	5	2026-09-25 11:20:38.76545	4	2026-09-25 11:23:36.111193	4	t
181	15	6	4	2026-09-25 11:20:38.792855	4	2026-09-25 11:23:36.208232	4	t
182	15	6	3	2026-09-25 11:20:38.838905	4	2026-09-25 11:23:36.304853	4	t
183	15	6	8	2026-09-25 11:20:38.887115	4	2026-09-25 11:23:36.401789	4	t
184	15	6	7	2026-09-25 11:20:38.935604	4	2026-09-25 11:23:36.498872	4	t
185	15	6	6	2026-09-25 11:20:38.983157	4	2026-09-25 11:23:36.59542	4	t
1	15	6	1	2026-09-25 07:11:49.808127	1	2026-09-25 11:23:36.598498	4	t
251	15	9	2	2026-09-25 11:23:41.328447	4	\N	\N	t
252	15	9	5	2026-09-25 11:23:41.396874	4	\N	\N	t
253	15	9	4	2026-09-25 11:23:41.494196	4	\N	\N	t
254	15	9	3	2026-09-25 11:23:41.5901	4	\N	\N	t
255	15	9	8	2026-09-25 11:23:41.687063	4	\N	\N	t
256	15	9	7	2026-09-25 11:23:41.72464	4	\N	\N	t
257	15	9	6	2026-09-25 11:23:41.769832	4	\N	\N	t
260	15	11	4	2026-09-28 05:12:16.623123	1	\N	\N	t
261	15	11	3	2026-09-28 05:12:16.720205	1	\N	\N	t
262	15	11	1	2026-09-28 05:12:16.818072	1	\N	\N	t
263	23	4	1	2026-09-28 05:17:15.781433	1	\N	\N	t
264	23	4	2	2026-09-28 05:17:43.825268	1	\N	\N	t
265	23	4	4	2026-09-28 05:18:35.83389	1	\N	\N	t
266	23	4	3	2026-09-28 05:18:56.844712	1	\N	\N	t
270	24	4	2	2026-09-28 05:20:53.672832	1	\N	\N	t
271	24	4	4	2026-09-28 05:20:53.729707	1	\N	\N	t
272	24	4	3	2026-09-28 05:20:53.828536	1	\N	\N	t
273	24	4	1	2026-09-28 05:20:56.765389	1	\N	\N	t
198	15	4	3	2026-09-25 11:23:01.341433	4	2026-09-28 05:24:20.024968	1	t
3	15	4	1	2026-09-25 09:19:20.540993	1	2026-09-28 05:24:20.163211	1	t
274	24	11	1	2026-09-28 05:21:42.32126	1	2026-09-28 05:29:53.397012	1	f
275	24	11	2	2026-09-28 05:22:13.797173	1	2026-09-28 05:29:53.397012	1	f
276	24	11	4	2026-09-28 05:22:13.847093	1	2026-09-28 05:29:53.397012	1	f
277	24	11	3	2026-09-28 05:22:13.895446	1	2026-09-28 05:29:53.397012	1	f
267	24	1	2	2026-09-28 05:20:53.148989	1	2026-09-28 05:30:43.993261	1	f
268	24	1	3	2026-09-28 05:20:53.195322	1	2026-09-28 05:30:43.993261	1	f
269	24	1	1	2026-09-28 05:20:53.242382	1	2026-09-28 05:30:43.993261	1	f
167	7	5	1	2026-09-25 10:26:40.029069	4	2026-09-28 06:20:10.518478	4	f
178	7	6	1	2026-09-25 11:09:07.589027	4	2026-09-28 06:20:10.788726	4	f
287	7	4	2	2026-09-28 06:20:44.781221	4	\N	\N	t
288	7	4	3	2026-09-28 06:21:03.47744	4	\N	\N	t
289	7	5	2	2026-09-28 06:22:28.5333	4	\N	\N	t
290	7	5	3	2026-09-28 06:22:58.685359	4	\N	\N	t
291	15	20	2	2026-09-28 06:29:36.324977	1	\N	\N	t
292	15	20	1	2026-09-28 06:29:36.372043	1	\N	\N	t
293	15	21	2	2026-09-28 06:32:17.396884	1	\N	\N	t
294	15	21	1	2026-09-28 06:32:17.447756	1	\N	\N	t
187	15	1	2	2026-09-25 11:22:55.001038	4	2026-09-28 10:04:38.414947	1	f
194	15	1	1	2026-09-25 11:22:55.33452	4	2026-09-28 10:05:01.570551	1	f
280	24	2	2	2026-09-28 05:28:49.613331	1	2026-09-28 10:15:20.412869	1	f
281	24	2	3	2026-09-28 05:28:49.661282	1	2026-09-28 10:15:20.412869	1	f
283	24	7	1	2026-09-28 05:28:50.061234	1	2026-09-28 10:18:43.450115	1	t
284	24	7	2	2026-09-28 05:29:26.409326	1	2026-09-28 10:16:22.55911	1	f
285	24	7	3	2026-09-28 05:29:26.455527	1	2026-09-28 10:16:22.55911	1	f
282	24	2	1	2026-09-28 05:28:49.707324	1	2026-09-28 10:18:43.34588	1	f
188	15	1	5	2026-09-25 11:22:55.047934	4	2026-09-28 10:04:38.414947	1	f
189	15	1	4	2026-09-25 11:22:55.094538	4	2026-09-28 10:04:38.414947	1	f
190	15	1	3	2026-09-25 11:22:55.143346	4	2026-09-28 10:04:38.414947	1	f
191	15	1	8	2026-09-25 11:22:55.192961	4	2026-09-28 10:04:38.414947	1	f
192	15	1	7	2026-09-25 11:22:55.238862	4	2026-09-28 10:04:38.414947	1	f
193	15	1	6	2026-09-25 11:22:55.286905	4	2026-09-28 10:04:38.414947	1	f
286	7	1	2	2026-09-28 06:20:31.229281	4	2026-09-28 10:04:38.414947	1	f
295	20	1	1	2026-09-28 10:15:49.917111	4	\N	\N	t
296	20	4	2	2026-09-28 10:15:50.525286	4	\N	\N	t
297	20	4	5	2026-09-28 10:15:50.570599	4	\N	\N	t
298	20	4	4	2026-09-28 10:15:50.618422	4	\N	\N	t
299	20	4	3	2026-09-28 10:15:50.666897	4	\N	\N	t
300	20	4	8	2026-09-28 10:15:50.718035	4	\N	\N	t
301	20	4	6	2026-09-28 10:15:50.762093	4	\N	\N	t
302	20	4	1	2026-09-28 10:15:50.806188	4	\N	\N	t
303	20	5	2	2026-09-28 10:15:51.628739	4	\N	\N	t
304	20	5	5	2026-09-28 10:15:51.729684	4	\N	\N	t
305	20	5	4	2026-09-28 10:15:51.828565	4	\N	\N	t
306	20	5	3	2026-09-28 10:15:51.925626	4	\N	\N	t
307	20	5	8	2026-09-28 10:15:52.022964	4	\N	\N	t
308	20	5	7	2026-09-28 10:15:52.119639	4	\N	\N	t
309	20	5	6	2026-09-28 10:15:52.217231	4	\N	\N	t
310	20	5	1	2026-09-28 10:15:52.314881	4	\N	\N	t
311	20	6	2	2026-09-28 10:15:52.97721	4	\N	\N	t
312	20	6	5	2026-09-28 10:15:53.029224	4	\N	\N	t
313	20	6	4	2026-09-28 10:15:53.074381	4	\N	\N	t
314	20	6	3	2026-09-28 10:15:53.122487	4	\N	\N	t
315	20	6	8	2026-09-28 10:15:53.170216	4	\N	\N	t
316	20	6	7	2026-09-28 10:15:53.216632	4	\N	\N	t
317	20	6	6	2026-09-28 10:15:53.262514	4	\N	\N	t
318	20	6	1	2026-09-28 10:15:53.306249	4	\N	\N	t
319	20	2	2	2026-09-28 10:15:53.965146	4	\N	\N	t
320	20	2	5	2026-09-28 10:15:54.010184	4	\N	\N	t
321	20	2	4	2026-09-28 10:15:54.054325	4	\N	\N	t
322	20	2	3	2026-09-28 10:15:54.098899	4	\N	\N	t
323	20	2	8	2026-09-28 10:15:54.146091	4	\N	\N	t
324	20	2	7	2026-09-28 10:15:54.190315	4	\N	\N	t
325	20	2	6	2026-09-28 10:15:54.234356	4	\N	\N	t
326	20	2	1	2026-09-28 10:15:54.286309	4	\N	\N	t
327	20	7	2	2026-09-28 10:15:54.972779	4	\N	\N	t
328	20	7	5	2026-09-28 10:15:55.089949	4	\N	\N	t
329	20	7	4	2026-09-28 10:15:55.186351	4	\N	\N	t
330	20	7	3	2026-09-28 10:15:55.283801	4	\N	\N	t
331	20	7	8	2026-09-28 10:15:55.309023	4	\N	\N	t
332	20	7	7	2026-09-28 10:15:55.354184	4	\N	\N	t
333	20	7	6	2026-09-28 10:15:55.398227	4	\N	\N	t
334	20	7	1	2026-09-28 10:15:55.442132	4	\N	\N	t
335	20	8	2	2026-09-28 10:15:56.096713	4	\N	\N	t
336	20	8	5	2026-09-28 10:15:56.142232	4	\N	\N	t
337	20	8	4	2026-09-28 10:15:56.189845	4	\N	\N	t
338	20	8	3	2026-09-28 10:15:56.238052	4	\N	\N	t
339	20	8	8	2026-09-28 10:15:56.281841	4	\N	\N	t
340	20	8	7	2026-09-28 10:15:56.327637	4	\N	\N	t
341	20	8	6	2026-09-28 10:15:56.373961	4	\N	\N	t
342	20	8	1	2026-09-28 10:15:56.418228	4	\N	\N	t
343	20	9	2	2026-09-28 10:15:57.068614	4	\N	\N	t
344	20	9	5	2026-09-28 10:15:57.131915	4	\N	\N	t
345	20	9	4	2026-09-28 10:15:57.229157	4	\N	\N	t
346	20	9	3	2026-09-28 10:15:57.327853	4	\N	\N	t
347	20	9	8	2026-09-28 10:15:57.42471	4	\N	\N	t
348	20	9	7	2026-09-28 10:15:57.521973	4	\N	\N	t
349	20	9	6	2026-09-28 10:15:57.619447	4	\N	\N	t
350	20	9	1	2026-09-28 10:15:57.716485	4	\N	\N	t
351	20	10	2	2026-09-28 10:15:58.38068	4	\N	\N	t
352	20	10	5	2026-09-28 10:15:58.427657	4	\N	\N	t
353	20	10	4	2026-09-28 10:15:58.474106	4	\N	\N	t
354	20	10	3	2026-09-28 10:15:58.519129	4	\N	\N	t
355	20	10	8	2026-09-28 10:15:58.566079	4	\N	\N	t
356	20	10	7	2026-09-28 10:15:58.645677	4	\N	\N	t
357	20	10	6	2026-09-28 10:15:58.690802	4	\N	\N	t
358	20	10	1	2026-09-28 10:15:58.738175	4	\N	\N	t
359	20	11	2	2026-09-28 10:15:59.224729	4	\N	\N	t
360	20	11	4	2026-09-28 10:15:59.270518	4	\N	\N	t
361	20	11	3	2026-09-28 10:15:59.318787	4	\N	\N	t
362	20	11	1	2026-09-28 10:15:59.365794	4	\N	\N	t
363	20	20	2	2026-09-28 10:15:59.768796	4	\N	\N	t
364	20	20	1	2026-09-28 10:15:59.814083	4	\N	\N	t
365	20	21	2	2026-09-28 10:16:00.252748	4	\N	\N	t
366	20	21	1	2026-09-28 10:16:00.333987	4	\N	\N	t
\.


--
-- Name: auth_session_session_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_session_session_id_seq', 203, true);


--
-- Name: mst_currency_currency_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_currency_currency_id_seq', 14, true);


--
-- Name: mst_estimation_phases_phase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_estimation_phases_phase_id_seq', 10, true);


--
-- Name: mst_menu_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_menu_permissions_id_seq', 299, true);


--
-- Name: mst_menus_menu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_menus_menu_id_seq', 21, true);


--
-- Name: mst_permissions_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_permissions_permission_id_seq', 8, true);


--
-- Name: mst_permissions_tracker_tracker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_permissions_tracker_tracker_id_seq', 18, true);


--
-- Name: mst_proposal_section_proposal_section_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_proposal_section_proposal_section_id_seq', 1, false);


--
-- Name: mst_rate_ratemaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_rate_ratemaster_id_seq', 3, true);


--
-- Name: mst_rate_tracker_tracker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_rate_tracker_tracker_id_seq', 5, true);


--
-- Name: mst_rfp_questions_question_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_rfp_questions_question_id_seq', 4, true);


--
-- Name: mst_rfp_questions_tracker_tracker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_rfp_questions_tracker_tracker_id_seq', 15, true);


--
-- Name: mst_roles_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_roles_role_id_seq', 25, true);


--
-- Name: mst_roles_tracker_tracker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_roles_tracker_tracker_id_seq', 28, true);


--
-- Name: mst_stage_stage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_stage_stage_id_seq', 1, false);


--
-- Name: mst_stage_tracker_stage_tracker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_stage_tracker_stage_tracker_id_seq', 1, false);


--
-- Name: mst_sub_stage_sub_stage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_sub_stage_sub_stage_id_seq', 1, false);


--
-- Name: mst_sub_stage_tracker_sub_stage_id_tracker_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_sub_stage_tracker_sub_stage_id_tracker_seq', 1, false);


--
-- Name: mst_user_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mst_user_user_id_seq', 16, true);


--
-- Name: password_reset_token_token_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_token_token_id_seq', 24, true);


--
-- Name: tbl_estimation_phases_tracker_phase_tracker_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tbl_estimation_phases_tracker_phase_tracker_id_seq', 29, true);


--
-- Name: tbl_reason_codes_reason_code_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tbl_reason_codes_reason_code_id_seq', 1, false);


--
-- Name: tbl_role_menu_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tbl_role_menu_permission_id_seq', 368, true);


--
-- Name: auth_session auth_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_session
    ADD CONSTRAINT auth_session_pkey PRIMARY KEY (session_id);


--
-- Name: auth_session auth_session_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_session
    ADD CONSTRAINT auth_session_token_hash_key UNIQUE (token_hash);


--
-- Name: mst_currency mst_currency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_currency
    ADD CONSTRAINT mst_currency_pkey PRIMARY KEY (currency_id);


--
-- Name: mst_estimation_phases mst_estimation_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_estimation_phases
    ADD CONSTRAINT mst_estimation_phases_pkey PRIMARY KEY (phase_id);


--
-- Name: tbl_menuwise_permission mst_menu_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_menuwise_permission
    ADD CONSTRAINT mst_menu_permissions_pkey PRIMARY KEY (id);


--
-- Name: mst_menus mst_menus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_menus
    ADD CONSTRAINT mst_menus_pkey PRIMARY KEY (menu_id);


--
-- Name: mst_permissions mst_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_permissions
    ADD CONSTRAINT mst_permissions_pkey PRIMARY KEY (permission_id);


--
-- Name: mst_permissions_tracker mst_permissions_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_permissions_tracker
    ADD CONSTRAINT mst_permissions_tracker_pkey PRIMARY KEY (tracker_id);


--
-- Name: mst_proposal_section mst_proposal_section_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_proposal_section
    ADD CONSTRAINT mst_proposal_section_pkey PRIMARY KEY (proposal_section_id);


--
-- Name: mst_rate mst_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rate
    ADD CONSTRAINT mst_rate_pkey PRIMARY KEY (ratemaster_id);


--
-- Name: mst_rate_tracker mst_rate_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rate_tracker
    ADD CONSTRAINT mst_rate_tracker_pkey PRIMARY KEY (tracker_id);


--
-- Name: mst_rfp_questions mst_rfp_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rfp_questions
    ADD CONSTRAINT mst_rfp_questions_pkey PRIMARY KEY (question_id);


--
-- Name: mst_rfp_questions_tracker mst_rfp_questions_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rfp_questions_tracker
    ADD CONSTRAINT mst_rfp_questions_tracker_pkey PRIMARY KEY (tracker_id);


--
-- Name: mst_roles mst_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_roles
    ADD CONSTRAINT mst_roles_pkey PRIMARY KEY (role_id);


--
-- Name: mst_roles_tracker mst_roles_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_roles_tracker
    ADD CONSTRAINT mst_roles_tracker_pkey PRIMARY KEY (tracker_id);


--
-- Name: mst_stage mst_stage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_stage
    ADD CONSTRAINT mst_stage_pkey PRIMARY KEY (stage_id);


--
-- Name: mst_stage_tracker mst_stage_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_stage_tracker
    ADD CONSTRAINT mst_stage_tracker_pkey PRIMARY KEY (stage_tracker_id);


--
-- Name: mst_sub_stage mst_sub_stage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_sub_stage
    ADD CONSTRAINT mst_sub_stage_pkey PRIMARY KEY (sub_stage_id);


--
-- Name: mst_sub_stage_tracker mst_sub_stage_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_sub_stage_tracker
    ADD CONSTRAINT mst_sub_stage_tracker_pkey PRIMARY KEY (sub_stage_id_tracker);


--
-- Name: mst_user mst_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_user
    ADD CONSTRAINT mst_user_email_key UNIQUE (email);


--
-- Name: mst_user mst_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_user
    ADD CONSTRAINT mst_user_pkey PRIMARY KEY (user_id);


--
-- Name: password_reset_token password_reset_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_pkey PRIMARY KEY (token_id);


--
-- Name: password_reset_token password_reset_token_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_token_hash_key UNIQUE (token_hash);


--
-- Name: tbl_estimation_phases_tracker tbl_estimation_phases_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_estimation_phases_tracker
    ADD CONSTRAINT tbl_estimation_phases_tracker_pkey PRIMARY KEY (phase_tracker_id);


--
-- Name: tbl_reason_codes tbl_reason_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_reason_codes
    ADD CONSTRAINT tbl_reason_codes_pkey PRIMARY KEY (reason_code_id);


--
-- Name: tbl_role_menu_permission tbl_role_menu_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_role_menu_permission
    ADD CONSTRAINT tbl_role_menu_permission_pkey PRIMARY KEY (id);


--
-- Name: tbl_menuwise_permission uq_menu_permission; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_menuwise_permission
    ADD CONSTRAINT uq_menu_permission UNIQUE (menu_id, permission_id);


--
-- Name: tbl_role_menu_permission uq_role_menu_permission; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_role_menu_permission
    ADD CONSTRAINT uq_role_menu_permission UNIQUE (role_id, menu_id, permission_id);


--
-- Name: idx_auth_session_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_session_token_hash ON public.auth_session USING btree (token_hash);


--
-- Name: idx_menu_permissions_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_permissions_menu_id ON public.tbl_menuwise_permission USING btree (menu_id);


--
-- Name: idx_menu_permissions_permission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_permissions_permission_id ON public.tbl_menuwise_permission USING btree (permission_id);


--
-- Name: idx_password_reset_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_token_hash ON public.password_reset_token USING btree (token_hash);


--
-- Name: idx_rmp_menu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rmp_menu_id ON public.tbl_role_menu_permission USING btree (menu_id);


--
-- Name: idx_rmp_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rmp_role_id ON public.tbl_role_menu_permission USING btree (role_id);


--
-- Name: ux_mst_estimation_phases_phase_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_mst_estimation_phases_phase_code ON public.mst_estimation_phases USING btree (lower((phase_code)::text)) WHERE (phase_code IS NOT NULL);


--
-- Name: ux_mst_estimation_phases_phase_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_mst_estimation_phases_phase_name ON public.mst_estimation_phases USING btree (lower((phase_name)::text));


--
-- Name: ux_mst_rfp_questions_question; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_mst_rfp_questions_question ON public.mst_rfp_questions USING btree (lower((question)::text));


--
-- Name: ux_mst_roles_role_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_mst_roles_role_code ON public.mst_roles USING btree (lower((role_code)::text)) WHERE (role_code IS NOT NULL);


--
-- Name: ux_mst_roles_role_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_mst_roles_role_name ON public.mst_roles USING btree (lower((role_name)::text));


--
-- Name: auth_session auth_session_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_session
    ADD CONSTRAINT auth_session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mst_user(user_id) ON DELETE CASCADE;


--
-- Name: tbl_menuwise_permission fk_menu_permissions_menu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_menuwise_permission
    ADD CONSTRAINT fk_menu_permissions_menu FOREIGN KEY (menu_id) REFERENCES public.mst_menus(menu_id) ON DELETE CASCADE;


--
-- Name: tbl_menuwise_permission fk_menu_permissions_permission; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_menuwise_permission
    ADD CONSTRAINT fk_menu_permissions_permission FOREIGN KEY (permission_id) REFERENCES public.mst_permissions(permission_id) ON DELETE CASCADE;


--
-- Name: mst_rate fk_mst_rate_currency; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_rate
    ADD CONSTRAINT fk_mst_rate_currency FOREIGN KEY (currency_id) REFERENCES public.mst_currency(currency_id);


--
-- Name: mst_sub_stage fk_mst_sub_stage_stage_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_sub_stage
    ADD CONSTRAINT fk_mst_sub_stage_stage_id FOREIGN KEY (stage_id) REFERENCES public.mst_stage(stage_id);


--
-- Name: mst_sub_stage_tracker fk_mst_sub_stage_tracker_stage_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_sub_stage_tracker
    ADD CONSTRAINT fk_mst_sub_stage_tracker_stage_id FOREIGN KEY (stage_id) REFERENCES public.mst_stage(stage_id);


--
-- Name: mst_sub_stage_tracker fk_mst_sub_stage_tracker_sub_stage_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mst_sub_stage_tracker
    ADD CONSTRAINT fk_mst_sub_stage_tracker_sub_stage_id FOREIGN KEY (sub_stage_id) REFERENCES public.mst_sub_stage(sub_stage_id);


--
-- Name: tbl_role_menu_permission fk_rmp_menu; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_role_menu_permission
    ADD CONSTRAINT fk_rmp_menu FOREIGN KEY (menu_id) REFERENCES public.mst_menus(menu_id) ON DELETE CASCADE;


--
-- Name: tbl_role_menu_permission fk_rmp_permission; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_role_menu_permission
    ADD CONSTRAINT fk_rmp_permission FOREIGN KEY (permission_id) REFERENCES public.mst_permissions(permission_id) ON DELETE CASCADE;


--
-- Name: tbl_role_menu_permission fk_rmp_role; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tbl_role_menu_permission
    ADD CONSTRAINT fk_rmp_role FOREIGN KEY (role_id) REFERENCES public.mst_roles(role_id) ON DELETE CASCADE;


--
-- Name: password_reset_token password_reset_token_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_token
    ADD CONSTRAINT password_reset_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.mst_user(user_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Foq31SnpcqBA86K1TwL2tf4pEP0sd1Ln2ZGD7NtwhM80Boaqc7f0Cxcc75HIVoC

