import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { Prisma } from '@prisma/client';
import { catchError, firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CustomRpcException } from 'src/common/exceptions/rpc.exception';
import { buildPagination } from 'src/helpers/pagination.helper';
import { PRODUCT_SERVICE } from 'src/config/services';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { Product } from './interfaces';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items } = createOrderDto;

    // 1. Validate products
    const productIds = items.map((product) => product.productId);

    const productsObservable = this.productClient
      .send({ cmd: 'validate_products' }, productIds)
      .pipe(
        catchError((error) => {
          throw new CustomRpcException(error);
        }),
      );

    const products = await firstValueFrom<Product[]>(productsObservable);

    // 2. Calculate total price and total items
    const totalAmount = products.reduce((acc, product) => {
      const orderItem = items.find((item) => item.productId === product.id);
      return acc + product.price * orderItem.quantity;
    }, 0);

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    const orderItems: Prisma.OrderItemCreateManyOrderInput[] = products.map(
      (product) => ({
        productId: product.id,
        price: product.price,
        quantity: items.find((item) => item.productId === product.id).quantity,
      }),
    );

    // 3. Create order
    const order = await this.prismaService.order
      .create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: orderItems,
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              productId: true,
              price: true,
              quantity: true,
            },
          },
        },
      })
      .catch((error) => {
        throw new CustomRpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: error.message,
        });
      });

    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => ({
        ...item,
        name: products.find((product) => product.id === item.productId).name,
      })),
    };
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page, limit, status } = orderPaginationDto;

    const ordersPromise = this.prismaService.order.findMany({
      where: { status },
      take: limit,
      skip: (page - 1) * limit,
    });

    const totalPromise = this.prismaService.order.count({ where: { status } });

    const [orders, total] = await this.prismaService.$transaction([
      ordersPromise,
      totalPromise,
    ]);

    return buildPagination(orders, total, page, limit);
  }

  async findOne(id: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new CustomRpcException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `Order with id: ${id} not found`,
      });
    }

    const productIds = order.OrderItem.map((item) => item.productId);

    const productsObservable = this.productClient
      .send({ cmd: 'validate_products' }, productIds)
      .pipe(
        catchError((error) => {
          throw new CustomRpcException(error);
        }),
      );

    const products = await firstValueFrom<Product[]>(productsObservable);

    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => ({
        ...item,
        name: products.find((product) => product.id === item.productId).name,
      })),
    };
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) return order;

    return this.prismaService.order.update({
      where: { id },
      data: { status },
    });
  }
}
