<?php

$config = [
    'admin' => [
        'core:AdminPassword',
    ],

    'example-userpass' => [
        'exampleauth:UserPass',

        'user1:user1pass' => [
            'uid'       => ['user1'],
            'firstName' => ['Aristotle'],
            'lastName'  => ['Stagira'],
            'onyen'     => ['astag'],
            'pid'       => ['730012345'],
            'email'     => ['astag@ad.unc.edu'],
        ],

        'user2:user2pass' => [
            'uid'       => ['user2'],
            'firstName' => ['Hypatia'],
            'lastName'  => ['Alexandria'],
            'onyen'     => ['hyalex'],
            'pid'       => ['730067890'],
            'email'     => ['hyalex@ad.unc.edu'],
        ],
    ],
];
