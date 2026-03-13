<?php

/**
 * Mock SAML IdP users for local development.
 *
 * Attribute names mirror the university's real IdP (LDAP variables).
 * The application consumes: givenName, sn, uid (Onyen), pid, mail.
 *
 * Roles (student, staff, admin) are assigned within the application,
 * NOT derived from the SAML assertion. The users below are grouped
 * by their *intended* test role for developer convenience.
 *
 * Credentials follow the pattern <username>:<username>pass
 */

$config = [
    'admin' => [
        'core:AdminPassword',
    ],

    'example-userpass' => [
        'exampleauth:UserPass',

        // ── Students ────────────────────────────────────────────

        'student1:student1pass' => [
            'uid'                  => ['adlov'],
            'givenName'            => ['Ada'],
            'sn'                   => ['Lovelace'],
            'displayName'          => ['Ada Lovelace'],
            'mail'                 => ['adlov@ad.unc.edu'],
            'pid'                  => ['730100001'],
            'eduPersonNickname'    => ['Ada'],
            'uncPreferredSurname'  => ['Lovelace'],
            'affiliation'          => ['student'],
        ],

        'student2:student2pass' => [
            'uid'                  => ['altur'],
            'givenName'            => ['Alan'],
            'sn'                   => ['Turing'],
            'displayName'          => ['Alan Turing'],
            'mail'                 => ['altur@ad.unc.edu'],
            'pid'                  => ['730100002'],
            'eduPersonNickname'    => ['Alan'],
            'uncPreferredSurname'  => ['Turing'],
            'affiliation'          => ['student'],
        ],

        'student3:student3pass' => [
            'uid'                  => ['grhop'],
            'givenName'            => ['Grace'],
            'sn'                   => ['Hopper'],
            'displayName'          => ['Grace Hopper'],
            'mail'                 => ['grhop@ad.unc.edu'],
            'pid'                  => ['730100003'],
            'eduPersonNickname'    => ['Grace'],
            'uncPreferredSurname'  => ['Hopper'],
            'affiliation'          => ['student'],
        ],

        // ── Staff ───────────────────────────────────────────────

        'staff1:staff1pass' => [
            'uid'                  => ['macur'],
            'givenName'            => ['Marie'],
            'sn'                   => ['Curie'],
            'displayName'          => ['Marie Curie'],
            'mail'                 => ['macur@ad.unc.edu'],
            'pid'                  => ['730200001'],
            'eduPersonNickname'    => ['Marie'],
            'uncPreferredSurname'  => ['Curie'],
            'affiliation'          => ['staff'],
        ],

        'staff2:staff2pass' => [
            'uid'                  => ['nites'],
            'givenName'            => ['Nikola'],
            'sn'                   => ['Tesla'],
            'displayName'          => ['Nikola Tesla'],
            'mail'                 => ['nites@ad.unc.edu'],
            'pid'                  => ['730200002'],
            'eduPersonNickname'    => ['Nikola'],
            'uncPreferredSurname'  => ['Tesla'],
            'affiliation'          => ['staff'],
        ],

        // ── Admins ──────────────────────────────────────────────

        'admin1:admin1pass' => [
            'uid'                  => ['alein'],
            'givenName'            => ['Albert'],
            'sn'                   => ['Einstein'],
            'displayName'          => ['Albert Einstein'],
            'mail'                 => ['alein@ad.unc.edu'],
            'pid'                  => ['730300001'],
            'eduPersonNickname'    => ['Albert'],
            'uncPreferredSurname'  => ['Einstein'],
            'affiliation'          => ['staff'],
        ],

        'admin2:admin2pass' => [
            'uid'                  => ['rofra'],
            'givenName'            => ['Rosalind'],
            'sn'                   => ['Franklin'],
            'displayName'          => ['Rosalind Franklin'],
            'mail'                 => ['rofra@ad.unc.edu'],
            'pid'                  => ['730300002'],
            'eduPersonNickname'    => ['Rosalind'],
            'uncPreferredSurname'  => ['Franklin'],
            'affiliation'          => ['staff'],
        ],
    ],
];
