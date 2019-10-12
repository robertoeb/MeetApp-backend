import * as Yup from 'yup';
import { endOfDay } from 'date-fns';
import Meetup from '../models/Meetup';
import User from '../models/User';
import File from '../models/File';

class MeetupController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const meetups = await Meetup.findAll({
      order: ['date_time'],
      limit: 20,
      offset: (page - 1) * 20,
      attributes: {
        exclude: ['user_id', 'banner_id'],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    return res.json(meetups);
  }

  async show(req, res) {
    const meetup = await Meetup.findByPk(req.params.id, {
      attributes: {
        exclude: ['user_id', 'banner_id'],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    if (!meetup) {
      if (!meetup) {
        return res.status(404).json({
          error: "This meetup doesn't exist anymore",
        });
      }
    }

    return res.json(meetup);
  }

  async showUserMeetups(req, res) {
    const { page = 1 } = req.query;

    const meetups = await Meetup.findAll({
      where: { user_id: req.userId },
      order: ['date_time'],
      limit: 20,
      offset: (page - 1) * 20,
      attributes: {
        exclude: ['user_id', 'banner_id'],
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    return res.json(meetups);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string()
        .required()
        .max(80),
      description: Yup.string()
        .required()
        .max(4000),
      latitude: Yup.number().required(),
      longitude: Yup.number().required(),
      date_time: Yup.date()
        .required()
        .min(endOfDay(new Date())),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { title, description, latitude, longitude, date_time } = req.body;

    const meetup = await Meetup.create({
      title,
      description,
      latitude,
      longitude,
      date_time,
      user_id: req.userId,
    });

    return res.status(201).json(meetup);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().min(1),
      description: Yup.string().min(1),
      latitude: Yup.number(),
      longitude: Yup.number(),
      date_time: Yup.date().min(new Date()),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const meetup = await Meetup.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
      attributes: {
        exclude: ['user_id', 'banner_id'],
      },
    });

    if (meetup.user.id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to edit this meetup",
      });
    }

    const updatedMeetup = await meetup.update(req.body);

    return res.json(updatedMeetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    if (!meetup) {
      return res.status(404).json({
        error: "This meetup doesn't exist anymore",
      });
    }

    if (meetup.date_time <= new Date()) {
      return res.status(401).json({
        error: "You can only cancel meetups that didn't happen",
      });
    }

    if (meetup.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this meetup",
      });
    }

    meetup.destroy();

    return res.status(204).json();
  }
}

export default new MeetupController();
