from .models import Project, Region, Site

"""
just random data
https://99farmers.org/communities/ 

Honduras has 18 deparnment(like states) and there is a capital(head city) for evry department
- Santa Rosa de Copán, Copán, Honduras are 14.766700° N, -88.783300° W
- city of Comayagua in the Comayagua Department,  Honduras are 14.452220° N, -87.638330° W
- Juticalpa, Olancho, Honduras are 14.666390° N, 86.218610° W 
- city of Yoro in Yoro Department, Honduras, are 15.133300° N, 87.133300° W
- La Ceiba, Atlántida department, Honduras are 15.779170° N, -86.793060° W  

assuming each deparment is a region
"""

REGIONS = {
    "Atlántida": ("15.779170", "-86.793060"),  # La Ceiba
    "Yoro": ("15.133300", "-87.133300"),  # Yoro
    "Olancho": ("14.666390", "-86.218610"),  # Juticalpa
    "Comayagua": ("14.452220", "-87.638330"),  # Comayagua
    "Copán": ("14.766700", "-88.783300"),  # Santa Rosa de Copán
}

PROJECTS = [
    {
        "name": "Inga Alley Cropping – North Coast",
        "description": "Alley cropping with Inga trees",
        "active": True,
        "log_schema": {
            "Inga seeds": "numerical",
            "Citrus trees": "numerical",
            "Soil tested": "boolean",
            "Notes": "text",
        },
        "sites": [
            # (name, region, adresss w/ municipality, description)
            ("Finca El Naranjo", "Atlántida", "Aldea El Naranjo, La Ceiba",
             "Steep plot above the river; access by footpath in rainy season."),
            ("Finca La Esperanza", "Atlántida", "Aldea La Esperanza, Tela", "New planting this season."),
            ("Finca San Isidro", "Yoro", "Aldea San Isidro, Olanchito", "Former cattle pasture being restored."),
            ("Finca Las Palmas", "Yoro", "Caserío Las Palmas, Yoro", ""),
        ],
    },
    # Inactive on purpose: it must NOT appear in GET /api/projects/.
    {
        "name": "2010 Trial (closed)",
        "description": "Early trial, finished in 2021. Kept for historical records.",
        "active": False,
        "log_schema": {},
        "sites": [
            ("Finca El Encino", "Yoro", "Aldea El Encino, Yoro", ""),
        ],
    }
]
