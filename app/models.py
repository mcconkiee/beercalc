from app import db
import simplejson

ROLE_USER = 0
ROLE_ADMIN = 1


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    role = db.Column(db.SmallInteger, default=ROLE_USER)
    name = db.Column(db.String(120), index=True, unique=True)
    brews = db.relationship(
        'Brew',
        backref=db.backref('user', lazy='select')
    )

    def is_authenticated(self):
        return True

    def is_active(self):
        return True

    def is_anonymous(self):
        return False

    def get_id(self):
        return unicode(self.id)

    def __repr__(self):
        return '<User %r>' % (self.username)


class Style(db.Model):
    id = db.Column(db.String(10), primary_key=True)
    name = db.Column(db.Text)
    og_high = db.Column(db.Float)
    og_low = db.Column(db.Float)
    fg_low = db.Column(db.Float)
    fg_high = db.Column(db.Float)
    abv_low = db.Column(db.Float)
    abv_high = db.Column(db.Float)
    ibu_low = db.Column(db.Float)
    ibu_high = db.Column(db.Float)
    srm_low = db.Column(db.Float)
    srm_high = db.Column(db.Float)

    def __repr__(self):
        return '<Style %r>' % (self.name)

    @property
    def serialize(self):
        return {
            'id': self.id,
            'name': self.name,
            'stats': [
                {'name': 'og', 'low': self.og_low, 'high': self.og_high},
                {'name': 'fg', 'low': self.fg_low, 'high': self.fg_high},
                {'name': 'abv', 'low': self.abv_low, 'high': self.abv_high},
                {'name': 'ibu', 'low': self.ibu_low, 'high': self.ibu_high},
                {'name': 'srm', 'low': self.srm_low, 'high': self.srm_high},
            ]
        }


class Brew(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(140))
    data = db.Column(db.Text)
    public = db.Column(db.Boolean)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

    def __repr__(self):
        return '<Brew %r>' % (self.name)

    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        data = simplejson.loads(self.data)
        data["id"] = self.id
        return data


class Malt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(140))
    color = db.Column(db.Float)
    ppg = db.Column(db.Float)
    description = db.Column(db.Text)

    def __repr__(self):
        return '<Malt %r>' % (self.name)

    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
            'ppg': self.ppg,
            'description': self.description
        }


class Hop(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(140))
    alpha_acid = db.Column(db.Float)
    profile = db.Column(db.Text)

    def __repr__(self):
        return '<Hop %r>' % (self.name)

    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        return {
            'id': self.id,
            'name': self.name,
            'alpha_acid': self.alpha_acid,
            'profile': self.profile
        }


class Yeast(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(140))
    attenuation = db.Column(db.Integer)
    type = db.Column(db.String(20))
    flavor = db.Column(db.Text)

    def __repr__(self):
        return '<Yeast %r>' % (self.name)

    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        return {
            'id': self.id,
            'name': self.name,
            'attenuation': self.attenuation,
            'type': self.type,
            'flavor': self.flavor
        }
