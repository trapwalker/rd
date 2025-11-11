"""User profile and character API routes."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse

from app.models.user import User
from app.schemas.profile import (
    CarInfoSchema,
    ProfileInfoSchema,
    QuickGameCar,
    QuickGameCarsResponse,
    SkillsSchema,
    UserProfileResponse,
)
from app.utils.deprecation import migration_target

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/user-info", response_model=UserProfileResponse)
@migration_target("sublayers_server.handlers.site_api.APIGetUserInfoHandler")
async def get_user_info(username: str) -> UserProfileResponse:
    """
    Get user profile information including skills, balance, car, position.

    Args:
        username: Username to get info for

    Returns:
        Complete user profile with rendered HTML templates (legacy compatibility)

    Migration from: sublayers_server.handlers.site_api.APIGetUserInfoHandler
    """
    # Find user by username
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # TODO: Get agent for user
    # agent = await get_agent_for_user(user, make=True)

    # Build profile info (using mock data for now)
    profile_info = ProfileInfoSchema(
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        level=user.level,
        experience=user.experience,
        balance=user.coins,
        karma=0,  # TODO: Get from agent
        skills=SkillsSchema(
            driving=0,  # TODO: Get from agent.example.profile
            shooting=0,
            masking=0,
            engineering=0,
            trading=0,
            leading=0,
        ),
        character_class=None,  # TODO: Get from agent.example.profile.role_class
        about_self=None,  # TODO: Get from agent.example.profile.about_self
        position=None,  # TODO: Get from agent.example.profile.car.position
        car=None,  # TODO: Build CarInfoSchema from agent car
    )

    logger.info(f"Getting profile info for user: {username}")

    return UserProfileResponse(
        user_info=profile_info,
        html_car_img=None,  # TODO: Render template
        name_car=None,  # TODO: Get from car
        html_agent=None,  # TODO: Render template
    )


@router.get("/user-info/{username}", response_model=ProfileInfoSchema)
@migration_target("sublayers_server.handlers.site_api.APIGetUserInfoHandler")
async def get_user_profile(username: str) -> ProfileInfoSchema:
    """
    Get user profile information (modern JSON response).

    Args:
        username: Username to get info for

    Returns:
        User profile information

    This is a cleaner alternative to get_user_info without legacy HTML templates.
    """
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    logger.info(f"Getting profile for user: {username}")

    return ProfileInfoSchema(
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        level=user.level,
        experience=user.experience,
        balance=user.coins,
        karma=0,  # TODO: Implement
        skills=SkillsSchema(),  # TODO: Get from agent
        character_class=user.role_class_uri,
        about_self=None,  # TODO: Get from agent
        position=(
            user.start_position.get("x", 0.0),
            user.start_position.get("y", 0.0)
        ) if user.start_position else None,
        car=None,  # TODO: Get from agent
    )


@router.get("/user-info-html/{username}", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.site_api.APIGetUserInfoHandler2")
async def get_user_info_html(username: str) -> HTMLResponse:
    """
    Get user profile as rendered HTML template.

    Args:
        username: Username to get info for

    Returns:
        HTML response with user profile

    Migration from: sublayers_server.handlers.site_api.APIGetUserInfoHandler2
    """
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # TODO: Get agent and render template
    # agent = await get_agent_for_user(user, make=True)
    # return templates.TemplateResponse("person/person_site_info.html", {...})

    logger.info(f"Rendering HTML profile for user: {username}")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>{user.username} - Profile</title>
        <style>
            body {{ font-family: Arial, sans-serif; background: #1a1a1a; color: #fff; padding: 20px; }}
            .profile {{ max-width: 600px; margin: 0 auto; background: #2a2a2a; padding: 20px; border-radius: 10px; }}
            .stat {{ margin: 10px 0; padding: 10px; background: #333; border-radius: 5px; }}
            .label {{ color: #ff6b00; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="profile">
            <h1>{user.display_name or user.username}</h1>
            <div class="stat"><span class="label">Username:</span> {user.username}</div>
            <div class="stat"><span class="label">Level:</span> {user.level}</div>
            <div class="stat"><span class="label">Experience:</span> {user.experience}</div>
            <div class="stat"><span class="label">Balance:</span> ${user.coins}</div>
            <div class="stat"><span class="label">Status:</span> {'Active' if user.is_active else 'Inactive'}</div>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)


@router.get("/car-info", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.site_api.APIGetCarInfoHandler")
async def get_car_info(username: str) -> HTMLResponse:
    """
    Get car information as HTML template.

    Args:
        username: Username whose car to get

    Returns:
        HTML response with car info

    Migration from: sublayers_server.handlers.site_api.APIGetCarInfoHandler
    """
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # TODO: Get agent and car
    # agent = await get_agent_for_user(user)
    # if not agent or not agent.example.profile.car:
    #     raise HTTPException(status_code=404)
    # ex_car = agent.example.profile.car
    # return templates.TemplateResponse("location/car_info_img_ext.html", {"car": ex_car})

    logger.warning(f"Legacy Site API called: get_car_info for {username}")

    html_content = """
    <!DOCTYPE html>
    <html>
    <body style="background: #1a1a1a; color: #fff; padding: 20px;">
        <h2>🚗 Car Info</h2>
        <p>Car information will be displayed here.</p>
        <p style="color: #999;">TODO: Implement car rendering from agent data</p>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)


@router.get("/car-info-uri", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.site_api.APIGetCarInfoHandler2")
async def get_car_info_by_uri(uri: str | None = None) -> HTMLResponse:
    """
    Get car information by registry URI.

    Args:
        uri: Car registry URI (e.g., reg:///registry/mobiles/cars/...)

    Returns:
        HTML response with car info

    Migration from: sublayers_server.handlers.site_api.APIGetCarInfoHandler2
    """
    # Hardcoded URI for now (same as original)
    if not uri:
        uri = "reg:///registry/mobiles/cars/middle/sports/04_delorean_dmc_12"

    # TODO: Load car from registry
    # ex_car = await registry.get(uri)
    # if not ex_car or not isinstance(ex_car, RegCar):
    #     raise HTTPException(status_code=404)
    # return templates.TemplateResponse("location/car_info_img_ext_for_clear_web.html", {"car": ex_car})

    logger.warning(f"Legacy Site API called: get_car_info_by_uri with uri={uri}")

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="background: #1a1a1a; color: #fff; padding: 20px;">
        <h2>🚗 Car Registry</h2>
        <p><strong>URI:</strong> {uri}</p>
        <p style="color: #999;">TODO: Load car from registry and render template</p>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)


@router.get("/quick-game-cars", response_model=QuickGameCarsResponse)
@migration_target("sublayers_server.handlers.site_api.APIGetQuickGameCarsHandler")
async def get_quick_game_cars() -> QuickGameCarsResponse:
    """
    Get quick game car templates.

    Returns:
        List of available quick game cars with HTML templates

    Migration from: sublayers_server.handlers.site_api.APIGetQuickGameCarsHandler
    """
    # TODO: Load from application.srv.quick_game_cars_examples
    # car_templates = []
    # for car_ex in quick_game_cars_examples:
    #     html = render_template("site/car_info_ext_wrap.html", car=car_ex)
    #     car_templates.append(html)

    logger.warning("Legacy Site API called: get_quick_game_cars")

    # Mock data for now
    mock_cars = [
        QuickGameCar(
            car_id="quick_car_1",
            name="Desert Runner",
            model="Buggy",
            description="Fast and agile desert vehicle",
            html_template="<div>Car 1 template</div>",
        ),
        QuickGameCar(
            car_id="quick_car_2",
            name="Wasteland Truck",
            model="Heavy Truck",
            description="Durable cargo hauler",
            html_template="<div>Car 2 template</div>",
        ),
        QuickGameCar(
            car_id="quick_car_3",
            name="Speed Demon",
            model="Sports Car",
            description="Maximum speed, minimum armor",
            html_template="<div>Car 3 template</div>",
        ),
    ]

    return QuickGameCarsResponse(quick_cars=mock_cars)


@router.get("/quick-game-cars-html", response_class=HTMLResponse)
@migration_target("sublayers_server.handlers.site_api.APIGetQuickGameCarsHandler2")
async def get_quick_game_cars_html() -> HTMLResponse:
    """
    Get quick game cars as HTML template.

    Returns:
        HTML response with car selection grid

    Migration from: sublayers_server.handlers.site_api.APIGetQuickGameCarsHandler2
    """
    # TODO: Load car examples and render template
    # car_examples = await get_quick_game_cars_examples()
    # return templates.TemplateResponse("site/quick_game_cars.html", {
    #     "car_examples": car_examples,
    #     "with_css": True
    # })

    logger.warning("Legacy Site API called: get_quick_game_cars_html")

    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Quick Game Cars</title>
        <style>
            body { font-family: Arial, sans-serif; background: #1a1a1a; color: #fff; padding: 20px; }
            .cars-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1200px; margin: 0 auto; }
            .car-card { background: #2a2a2a; padding: 20px; border-radius: 10px; border: 2px solid #444; text-align: center; }
            .car-card:hover { border-color: #ff6b00; cursor: pointer; }
            .car-icon { font-size: 60px; margin: 20px 0; }
            h1 { color: #ff6b00; text-align: center; }
        </style>
    </head>
    <body>
        <h1>🚗 Choose Your Car</h1>
        <div class="cars-grid">
            <div class="car-card">
                <div class="car-icon">🏎️</div>
                <h3>Desert Runner</h3>
                <p>Fast and agile</p>
            </div>
            <div class="car-card">
                <div class="car-icon">🚚</div>
                <h3>Wasteland Truck</h3>
                <p>Heavy and durable</p>
            </div>
            <div class="car-card">
                <div class="car-icon">🏁</div>
                <h3>Speed Demon</h3>
                <p>Maximum velocity</p>
            </div>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)


@router.get("/user/{user_id}/stats", response_model=dict[str, Any])
async def get_user_stats_by_id(user_id: str) -> dict[str, Any]:
    """
    Get user statistics by ID.

    Args:
        user_id: User ID

    Returns:
        User statistics
    """
    user = await User.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "user_id": str(user.id),
        "username": user.username,
        "level": user.level,
        "experience": user.experience,
        "coins": user.coins,
        "created_at": user.created_at.isoformat(),
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }
