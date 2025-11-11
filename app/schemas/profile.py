"""Profile and character schemas."""

from pydantic import BaseModel, Field


class SkillsSchema(BaseModel):
    """Player skills."""

    driving: int = Field(default=0, ge=0, le=100, description="Driving skill")
    shooting: int = Field(default=0, ge=0, le=100, description="Shooting skill")
    masking: int = Field(default=0, ge=0, le=100, description="Masking/stealth skill")
    engineering: int = Field(default=0, ge=0, le=100, description="Engineering skill")
    trading: int = Field(default=0, ge=0, le=100, description="Trading skill")
    leading: int = Field(default=0, ge=0, le=100, description="Leadership skill")


class CarInfoSchema(BaseModel):
    """Car information."""

    car_id: str = Field(description="Car unique ID")
    name: str = Field(description="Car name")
    model: str = Field(description="Car model")
    position: tuple[float, float] | None = Field(
        default=None,
        description="Car position (x, y)"
    )
    health: int = Field(default=100, ge=0, le=100, description="Car health")
    fuel: int = Field(default=100, ge=0, le=100, description="Fuel level")
    html_image: str | None = Field(default=None, description="HTML template for car image")


class ProfileInfoSchema(BaseModel):
    """Player profile information."""

    username: str = Field(description="Player username")
    display_name: str | None = Field(default=None, description="Display name")
    avatar_url: str | None = Field(default=None, description="Avatar URL")

    # Game stats
    level: int = Field(default=1, ge=1, description="Player level")
    experience: int = Field(default=0, ge=0, description="Experience points")
    balance: int = Field(default=0, description="In-game currency")
    karma: int = Field(default=0, description="Karma points")

    # Skills
    skills: SkillsSchema = Field(default_factory=SkillsSchema)

    # Character class
    character_class: str | None = Field(default=None, description="Character class")
    about_self: str | None = Field(default=None, description="Player bio/description")

    # Position
    position: tuple[float, float] | None = Field(
        default=None,
        description="Player position (x, y)"
    )

    # Car info
    car: CarInfoSchema | None = Field(default=None, description="Player's car")


class UserProfileResponse(BaseModel):
    """Complete user profile response."""

    user_info: ProfileInfoSchema
    html_car_img: str | None = Field(
        default=None,
        description="HTML template for car image (legacy)"
    )
    name_car: str | None = Field(default=None, description="Car name (legacy)")
    html_agent: str | None = Field(
        default=None,
        description="HTML template for agent info (legacy)"
    )


class QuickGameCar(BaseModel):
    """Quick game car template."""

    car_id: str
    name: str
    model: str
    description: str | None = None
    html_template: str | None = None


class QuickGameCarsResponse(BaseModel):
    """Quick game cars list."""

    quick_cars: list[QuickGameCar]
