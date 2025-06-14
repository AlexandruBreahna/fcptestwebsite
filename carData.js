const carData = {
    2018: {
        Audi: {
            "A5": {
                redirectUrls: {
                    default: "/carmakers/audi/a5",
                    parts: "/parts/audi/a5",
                    accessories: "/accessories/audi/a5"
                },
                "Premium Plus": {
                    "2dr Coupe": {
                        "2.0L TFSI Turbo 4-cyl 252hp": ["7-speed S tronic", "6-speed Manual"],
                        "3.0L TFSI V6 354hp": ["8-speed Tiptronic"]
                    },
                    "4dr Sportback": {
                        "2.0L TFSI Turbo 4-cyl 252hp": ["7-speed S tronic"],
                        "3.0L TFSI V6 354hp": ["8-speed Tiptronic"]
                    }
                },
                "Prestige": {
                    "2dr Cabrio": {
                        "2.0L TFSI Turbo 4-cyl 252hp": ["7-speed S tronic"],
                        "3.0L TFSI V6 354hp": ["8-speed Tiptronic"]
                    }
                }
            },
            "S5": {
                redirectUrls: {
                    default: "/carmakers/audi/s5",
                    parts: "/parts/audi/s5",
                    accessories: "/accessories/audi/s5"
                },
                "Premium Plus": {
                    "2dr Coupe": {
                        "3.0L TFSI V6 Turbo 354hp": ["8-speed Tiptronic"]
                    },
                    "4dr Sportback": {
                        "3.0L TFSI V6 Turbo 354hp": ["8-speed Tiptronic"]
                    }
                }
            },
            "A4": {
                redirectUrls: {
                    default: "/carmakers/audi/a4",
                    parts: "/parts/audi/a4",
                    accessories: "/accessories/audi/a4"
                },
                "Premium": {
                    "4dr Sedan": {
                        "2.0L TFSI Turbo 4-cyl 190hp": ["7-speed S tronic", "6-speed Manual"],
                        "2.0L TFSI Turbo 4-cyl 252hp": ["7-speed S tronic"]
                    }
                },
                "Premium Plus": {
                    "4dr Sedan": {
                        "2.0L TFSI Turbo 4-cyl 252hp": ["7-speed S tronic"]
                    }
                }
            }
        },
        BMW: {
            "3 Series": {
                redirectUrls: {
                    default: "/carmakers/bmw/3-series",
                    parts: "/parts/bmw/3-series",
                    accessories: "/accessories/bmw/3-series"
                },
                "330i": {
                    "4dr Sedan": {
                        "2.0L Twin Turbo 4-cyl 248hp": ["8-speed Automatic"]
                    }
                },
                "340i": {
                    "4dr Sedan": {
                        "3.0L Twin Turbo 6-cyl 320hp": ["8-speed Automatic", "6-speed Manual"]
                    }
                }
            },
            "4 Series": {
                redirectUrls: {
                    default: "/carmakers/bmw/4-series",
                    parts: "/parts/bmw/4-series",
                    accessories: "/accessories/bmw/4-series"
                },
                "430i": {
                    "2dr Coupe": {
                        "2.0L Twin Turbo 4-cyl 248hp": ["8-speed Automatic"]
                    },
                    "2dr Convertible": {
                        "2.0L Twin Turbo 4-cyl 248hp": ["8-speed Automatic"]
                    }
                },
                "440i": {
                    "2dr Coupe": {
                        "3.0L Twin Turbo 6-cyl 320hp": ["8-speed Automatic", "6-speed Manual"]
                    }
                }
            },
            "X3": {
                redirectUrls: {
                    default: "/carmakers/bmw/x3",
                    parts: "/parts/bmw/x3",
                    accessories: "/accessories/bmw/x3"
                },
                "xDrive30i": {
                    "4dr SUV": {
                        "2.0L Twin Turbo 4-cyl 248hp": ["8-speed Automatic"]
                    }
                }
            }
        }
    },
    2019: {
        Mercedes: {
            "C-Class": {
                redirectUrls: {
                    default: "/carmakers/mercedes/c-class",
                    parts: "/parts/mercedes/c-class",
                    accessories: "/accessories/mercedes/c-class"
                },
                "C300": {
                    "4dr Sedan": {
                        "2.0L Turbo 4-cyl 255hp": ["9-speed Automatic"]
                    },
                    "2dr Coupe": {
                        "2.0L Turbo 4-cyl 255hp": ["9-speed Automatic"]
                    }
                },
                "C43 AMG": {
                    redirectUrls: {
                        parts: "/parts/mercedes/c-class/amg"
                    },
                    "4dr Sedan": {
                        "3.0L Twin Turbo V6 385hp": ["9-speed AMG Speedshift"]
                    }
                }
            },
            "E-Class": {
                redirectUrls: {
                    default: "/carmakers/mercedes/e-class",
                    parts: "/parts/mercedes/e-class",
                    accessories: "/accessories/mercedes/e-class"
                },
                "E300": {
                    "4dr Sedan": {
                        "2.0L Turbo 4-cyl 255hp": ["9-speed Automatic"]
                    }
                },
                "E450": {
                    "4dr Sedan": {
                        "3.0L Twin Turbo V6 362hp": ["9-speed Automatic"]
                    }
                }
            }
        },
        Porsche: {
            "911": {
                redirectUrls: {
                    default: "/carmakers/porsche/911",
                    parts: "/parts/porsche/911",
                    accessories: "/accessories/porsche/911"
                },
                "Carrera": {
                    "2dr Coupe": {
                        "3.0L Twin Turbo H6 379hp": ["8-speed PDK", "7-speed Manual"]
                    }
                },
                "Carrera S": {
                    "2dr Coupe": {
                        "3.0L Twin Turbo H6 443hp": ["8-speed PDK", "7-speed Manual"]
                    },
                    "2dr Convertible": {
                        "3.0L Twin Turbo H6 443hp": ["8-speed PDK"]
                    }
                }
            },
            "Macan": {
                redirectUrls: {
                    default: "/carmakers/porsche/macan",
                    parts: "/parts/porsche/macan",
                    accessories: "/accessories/porsche/macan"
                },
                "Base": {
                    "4dr SUV": {
                        "2.0L Turbo 4-cyl 248hp": ["7-speed PDK"]
                    }
                },
                "S": {
                    "4dr SUV": {
                        "3.0L Twin Turbo V6 348hp": ["7-speed PDK"]
                    }
                }
            }
        }
    },
    2020: {
        Audi: {
            "A5": {
                redirectUrls: {
                    default: "/carmakers/audi/a5",
                    parts: "/parts/audi/a5",
                    accessories: "/accessories/audi/a5"
                },
                "Premium Plus": {
                    "4dr Sportback": {
                        "2.0L TFSI Turbo 4-cyl 261hp": ["7-speed S tronic"]
                    }
                }
            }
        },
        BMW: {
            "3 Series": {
                redirectUrls: {
                    default: "/carmakers/bmw/3-series",
                    parts: "/parts/bmw/3-series",
                    accessories: "/accessories/bmw/3-series"
                },
                "330i": {
                    "4dr Sedan": {
                        "2.0L Twin Turbo 4-cyl 255hp": ["8-speed Automatic"]
                    }
                }
            }
        },
        Mercedes: {
            "C-Class": {
                redirectUrls: {
                    default: "/carmakers/mercedes/c-class",
                    parts: "/parts/mercedes/c-class",
                    accessories: "/accessories/mercedes/c-class"
                },
                "C300": {
                    "4dr Sedan": {
                        "2.0L Turbo 4-cyl 255hp": ["9-speed Automatic"]
                    }
                }
            }
        },
        Porsche: {
            "911": {
                redirectUrls: {
                    default: "/carmakers/porsche/911",
                    parts: "/parts/porsche/911",
                    accessories: "/accessories/porsche/911"
                },
                "Carrera S": {
                    "2dr Coupe": {
                        "3.0L Twin Turbo H6 443hp": ["8-speed PDK", "7-speed Manual"]
                    }
                }
            }
        }
    }
};