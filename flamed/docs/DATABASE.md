# Database Schema Documentation

## Authentication & Users

### `public.admins`
| Column     | Type                     | Constraints / Default             |
| ---------- | ------------------------ | --------------------------------- |
| user_id    | uuid                     | **PK**; **FK** → `auth.users(id)` |
| created_at | timestamp with time zone | DEFAULT `now()`                   |

### `public.profiles`
| Column     | Type                     | Constraints / Default             |
| ---------- | ------------------------ | --------------------------------- |
| id         | uuid                     | **PK**; **FK** → `auth.users(id)` |
| full_name  | text                     |                                   |
| avatar_url | text                     |                                   |
| created_at | timestamp with time zone | DEFAULT `now()`                   |
| updated_at | timestamp with time zone | DEFAULT `now()`                   |

## Groups & Social Features

### `public.groups`
| Column     | Type                     | Constraints / Default                     |
| ---------- | ------------------------ | ----------------------------------------- |
| id         | uuid                     | **PK**; DEFAULT `gen_random_uuid()`       |
| name       | text                     | NOT NULL; CHECK `2 <= length(name) <= 80` |
| created_by | uuid                     | **FK** → `auth.users(id)`                 |
| created_at | timestamp with time zone | DEFAULT `now()`                           |

### `public.group_members`
| Column     | Type                     | Constraints / Default                                                   |
| ---------- | ------------------------ | ----------------------------------------------------------------------- |
| group_id   | uuid                     | **PK (composite)**; **FK** → `public.groups(id)`                        |
| user_id    | uuid                     | **PK (composite)**; **FK** → `auth.users(id)`                           |
| role       | text                     | NOT NULL; DEFAULT `'member'`; CHECK `role ∈ {'owner','admin','member'}` |
| joined_at  | timestamp with time zone | DEFAULT `now()`                                                         |
| created_at | timestamp with time zone | NOT NULL; DEFAULT `now()`                                               |

### `public.group_invites`
| Column     | Type                     | Constraints / Default                          |
| ---------- | ------------------------ | ---------------------------------------------- |
| id         | uuid                     | **PK**; DEFAULT `gen_random_uuid()`            |
| group_id   | uuid                     | **FK** → `public.groups(id)`                   |
| code_hash  | text                     | NOT NULL                                       |
| max_uses   | integer                  | NOT NULL; DEFAULT `1`; CHECK `max_uses >= 1`   |
| used_count | integer                  | NOT NULL; DEFAULT `0`; CHECK `used_count >= 0` |
| expires_at | timestamp with time zone |                                                |
| created_by | uuid                     | **FK** → `auth.users(id)`                      |
| created_at | timestamp with time zone | DEFAULT `now()`                                |

### `public.group_messages`
| Column       | Type                     | Constraints / Default                                                  |
| ------------ | ------------------------ | ---------------------------------------------------------------------- |
| id           | bigint                   | **PK**; DEFAULT `nextval('group_messages_id_seq'::regclass)`           |
| group_id     | uuid                     | NOT NULL; **FK** → `public.groups(id)`                                 |
| user_id      | uuid                     | NOT NULL; **FK** → `auth.users(id)`                                    |
| content      | text                     | NOT NULL; CHECK `length(content) > 0 AND length(content) <= 4000`      |
| created_at   | timestamp with time zone | DEFAULT `now()`                                                        |
| edited_at    | timestamp with time zone |                                                                        |
| author_alias | text                     | CHECK `author_alias IS NULL OR 1 <= length(btrim(author_alias)) <= 40` |

## Restaurants & Location Data

### `public.restaurants`
| Column             | Type              | Constraints / Default               |
| ------------------ | ----------------- | ----------------------------------- |
| id                 | uuid              | **PK**; DEFAULT `gen_random_uuid()` |
| name               | character varying | NOT NULL                            |
| is_active          | boolean           | DEFAULT `true`                      |
| created_at         | timestamp with tz | DEFAULT `CURRENT_TIMESTAMP`         |
| updated_at         | timestamp with tz | DEFAULT `CURRENT_TIMESTAMP`         |
| external_id        | text              | UNIQUE                              |
| location_id        | bigint            |                                     |
| avg_rating         | numeric           |                                     |
| review_count       | integer           |                                     |
| status             | text              |                                     |
| status_text        | text              |                                     |
| price_tag          | text              |                                     |
| cuisines           | ARRAY             | (element type unspecified)          |
| has_menu           | boolean           |                                     |
| menu_url           | text              |                                     |
| parent_city        | text              |                                     |
| hero_img_url       | text              |                                     |
| square_img_url     | text              |                                     |
| thumbnail_template | text              |                                     |
| review_snippets    | jsonb             |                                     |
| raw                | jsonb             |                                     |

### `public.restaurant_geo`
| Column            | Type                     | Constraints / Default                     |
| ----------------- | ------------------------ | ----------------------------------------- |
| restaurant_id     | uuid                     | **PK**; **FK** → `public.restaurants(id)` |
| lat               | double precision         | NOT NULL                                  |
| lng               | double precision         | NOT NULL                                  |
| place_id          | text                     |                                           |
| formatted_address | text                     |                                           |
| provider          | text                     | DEFAULT `'google'`                        |
| accuracy          | text                     |                                           |
| updated_at        | timestamp with time zone | DEFAULT `now()`                           |
| geom              | USER-DEFINED             | (likely geometry)                         |
