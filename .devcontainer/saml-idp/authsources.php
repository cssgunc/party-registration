<?php

/**
 * Mock SAML IdP users for local development.
 *
 * Attribute names mirror the university's real IdP (LDAP variables).
 * The application consumes: givenName, sn, uid (Onyen), pid, mail.
 *
 * These accounts match frontend/shared/mock_data.json so that the
 * SAML login flow produces identities the backend already recognises.
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

        // -- Students ----------------------------------------------------

        // Established user - already registered and many parties
        'student1:student1pass' => [
            'uid'                  => ['stevenmorrison'],
            'givenName'            => ['Steven'],
            'sn'                   => ['Morrison'],
            'displayName'          => ['Steven Morrison'],
            'mail'                 => ['stevenmorrison@unc.edu'],
            'pid'                  => ['730523620'],
            'eduPersonNickname'    => ['Steven'],
            'uncPreferredSurname'  => ['Morrison'],
            'affiliation'          => ['student'],
        ],

        // Brand new user - not registered and no parties
        'student2:student2pass' => [
            'uid'                  => ['monicamalone'],
            'givenName'            => ['Monica'],
            'sn'                   => ['Malone'],
            'displayName'          => ['Monica Malone'],
            'mail'                 => ['monicamalone@unc.edu'],
            'pid'                  => ['730871361'],
            'eduPersonNickname'    => ['Monica'],
            'uncPreferredSurname'  => ['Malone'],
            'affiliation'          => ['student'],
        ],

        'student3:student3pass' => [
            'uid'                  => ['lauragonzales'],
            'givenName'            => ['Laura'],
            'sn'                   => ['Gonzales'],
            'displayName'          => ['Laura Gonzales'],
            'mail'                 => ['lauragonzales@unc.edu'],
            'pid'                  => ['730925227'],
            'eduPersonNickname'    => ['Laura'],
            'uncPreferredSurname'  => ['Gonzales'],
            'affiliation'          => ['student'],
        ],

        // Unauthenticated user - never signed up
        'student4:student4pass' => [
            'uid'                  => ['alexrivera'],
            'givenName'            => ['Alex'],
            'sn'                   => ['Rivera'],
            'displayName'          => ['Alex Rivera'],
            'mail'                 => ['alexrivera@unc.edu'],
            'pid'                  => ['730100001'],
            'eduPersonNickname'    => ['Alex'],
            'uncPreferredSurname'  => ['Rivera'],
            'affiliation'          => ['student'],
        ],

        // -- Staff ------------------------------------------------------

        'staff1:staff1pass' => [
            'uid'                  => ['janesmith'],
            'givenName'            => ['Jane'],
            'sn'                   => ['Smith'],
            'displayName'          => ['Jane Smith'],
            'mail'                 => ['janesmith@unc.edu'],
            'pid'                  => ['730737926'],
            'eduPersonNickname'    => ['Jane'],
            'uncPreferredSurname'  => ['Smith'],
            'affiliation'          => ['staff'],
        ],

        // -- Admins -----------------------------------------------------

        'admin1:admin1pass' => [
            'uid'                  => ['johndoe'],
            'givenName'            => ['John'],
            'sn'                   => ['Doe'],
            'displayName'          => ['John Doe'],
            'mail'                 => ['johndoe@unc.edu'],
            'pid'                  => ['730737345'],
            'eduPersonNickname'    => ['John'],
            'uncPreferredSurname'  => ['Doe'],
            'affiliation'          => ['staff'],
        ],

        // Unauthenticated user - never signed up
        'admin2:admin2pass' => [
            'uid'                  => ['priyapatel'],
            'givenName'            => ['Priya'],
            'sn'                   => ['Patel'],
            'displayName'          => ['Priya Patel'],
            'mail'                 => ['priyapatel@unc.edu'],
            'pid'                  => ['730100002'],
            'eduPersonNickname'    => ['Priya'],
            'uncPreferredSurname'  => ['Patel'],
            'affiliation'          => ['staff'],
        ],
    ],
];
